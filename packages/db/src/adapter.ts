import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import crypto from 'node:crypto';

const DB_DIR = path.resolve(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'careconnect.db');

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('synchronous = NORMAL');
db.pragma('cache_size = -64000');

db.exec(`
  CREATE TABLE IF NOT EXISTS collections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uid TEXT UNIQUE NOT NULL,
    collection TEXT NOT NULL,
    data TEXT NOT NULL DEFAULT '{}',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_col_name ON collections(collection);
  CREATE INDEX IF NOT EXISTS idx_col_uid ON collections(uid);
  CREATE INDEX IF NOT EXISTS idx_col_data_email ON collections(json_extract(data, '$.email'));
  CREATE INDEX IF NOT EXISTS idx_col_data_user_id ON collections(json_extract(data, '$.user_id'));
  CREATE INDEX IF NOT EXISTS idx_col_data_entity_id ON collections(json_extract(data, '$.entity_id'));
  CREATE INDEX IF NOT EXISTS idx_col_data_patient_id ON collections(json_extract(data, '$.patient_id'));
  CREATE INDEX IF NOT EXISTS idx_col_data_status ON collections(json_extract(data, '$.status'));

  CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY,
    applied_at TEXT DEFAULT (datetime('now'))
  );

  INSERT OR IGNORE INTO schema_version (version) VALUES (1);
`);

const stmts = {
  getAll: db.prepare('SELECT data FROM collections WHERE collection = ?'),
  getByUid: db.prepare('SELECT id, data FROM collections WHERE uid = ? AND collection = ?'),
  getById: db.prepare('SELECT id, data FROM collections WHERE id = ? AND collection = ?'),
  insert: db.prepare('INSERT INTO collections (uid, collection, data) VALUES (?, ?, ?)'),
  replaceAll: db.prepare('UPDATE collections SET data = ?, updated_at = datetime(\'now\') WHERE id = ? AND collection = ?'),
  deleteByKey: db.prepare('DELETE FROM collections WHERE (id = ? OR uid = ?) AND collection = ?'),
  deleteAll: db.prepare('DELETE FROM collections WHERE collection = ?'),
  countCol: db.prepare('SELECT COUNT(*) as count FROM collections WHERE collection = ?'),
  maxId: db.prepare('SELECT MAX(CAST(id AS INTEGER)) as max_id FROM collections WHERE collection = ?'),
};

const txInsertMany = db.transaction((collection: string, items: Array<{ uid: string; data: string }>) => {
  for (const item of items) {
    stmts.insert.run(item.uid, collection, item.data);
  }
});

const txReplaceAll = db.transaction((collection: string, items: Array<{ id: number; data: string }>) => {
  stmts.deleteAll.run(collection);
  for (const item of items) {
    stmts.insert.run(crypto.randomUUID(), collection, item.data);
  }
});

export interface DBRecord {
  id: string;
  uid: string;
  [key: string]: any;
}

export interface SchemaDefinition {
  required?: string[];
  types?: Record<string, string>;
  defaults?: Record<string, any>;
}

export class SQLiteAdapter {
  private schemas: Record<string, SchemaDefinition> = {};
  private subscribers: Record<string, Function[]> = {};

  constructor(schemas?: Record<string, SchemaDefinition>) {
    if (schemas) this.schemas = schemas;
  }

  setSchemas(schemas: Record<string, SchemaDefinition>) {
    this.schemas = schemas;
  }

  async get<T = any>(collection: string, _force?: boolean): Promise<T[]> {
    const rows = stmts.getAll.all(collection) as Array<{ data: string }>;
    return rows.map(row => JSON.parse(row.data)) as T[];
  }

  async findById<T = any>(collection: string, id: string): Promise<T | null> {
    let row = stmts.getById.get(id, collection) as { id: number; data: string } | undefined;
    if (!row) {
      row = stmts.getByUid.get(id, collection) as { id: number; data: string } | undefined;
    }
    if (!row) return null;
    return JSON.parse(row.data) as T;
  }

  async find<T = any>(collection: string, filter?: ((item: T) => boolean) | Record<string, any>): Promise<T[]> {
    const arr = await this.get<T>(collection);
    if (!filter) return arr;
    if (typeof filter === 'function') return arr.filter(filter);
    return arr.filter(record => {
      for (const [key, value] of Object.entries(filter)) {
        if ((record as any)[key] !== value) return false;
      }
      return true;
    });
  }

  async insert<T = any>(collection: string, item: Partial<T>): Promise<T & { id: string; uid: string }> {
    const schema = this.schemas[collection];
    if (schema?.defaults) item = { ...schema.defaults, ...item };
    this.validateSchema(collection, item);

    const maxRow = stmts.maxId.get(collection) as { max_id: number | null };
    const id = ((maxRow.max_id || 0) + 1).toString();
    const uid = crypto.randomUUID();
    const newItem = { ...item, id, uid, created_at: new Date().toISOString() } as T & { id: string; uid: string };

    stmts.insert.run(uid, collection, JSON.stringify(newItem));
    this.notifySubscribers(collection);
    return newItem;
  }

  async update<T = any>(collection: string, key: string, updates: Partial<T>): Promise<T> {
    let row = stmts.getById.get(key, collection) as { id: number; data: string } | undefined;
    if (!row) {
      row = stmts.getByUid.get(key, collection) as { id: number; data: string } | undefined;
    }
    if (!row) throw new Error(`Item with key "${key}" not found in collection "${collection}".`);

    const existing = JSON.parse(row.data);
    const updated = { ...existing, ...updates, updated_at: new Date().toISOString() };
    this.validateSchema(collection, updated);

    stmts.replaceAll.run(JSON.stringify(updated), row.id, collection);
    this.notifySubscribers(collection);
    return updated;
  }

  async delete<T = any>(collection: string, key: string): Promise<void> {
    const numId = parseInt(key, 10);
    const keyToUse = isNaN(numId) ? 0 : numId;
    stmts.deleteByKey.run(keyToUse, key, collection);
    this.notifySubscribers(collection);
  }

  async save<T = any>(collection: string, data: T[]): Promise<T[]> {
    const items = data.map((item: any) => ({
      id: item.id,
      data: JSON.stringify(item)
    }));
    txReplaceAll(collection, items);
    this.notifySubscribers(collection);
    return data;
  }

  async initializeAllCollections(): Promise<void> {
    const allCollections = [
      ...Object.keys(this.schemas),
      'users', 'profiles', 'user_roles', 'permissions',
      'entities', 'entity_verification', 'entity_locations', 'entity_staff',
      'entity_services', 'entity_specialties', 'specialties', 'insurance_providers', 'languages',
      'bookings', 'appointment_slots', 'booking_payments',
      'health_tools', 'tool_results', 'ai_consultations',
      'courses', 'course_modules', 'course_lessons', 'course_enrollments', 'course_progress', 'certificates',
      'products', 'orders', 'order_items', 'prescriptions',
      'causes', 'donations', 'cause_updates',
      'blog_posts', 'podcasts', 'pages', 'media_files',
      'reviews', 'ratings', 'messages', 'conversations', 'chat_sessions', 'notifications',
      'analytics_events', 'reports', 'payments', 'payment_methods', 'subscriptions',
      'audit_logs', 'feature_flags', 'system_settings',
      'booking_reminders', 'newsletter_subscriptions', 'news_sources', 'news_articles',
      'verification_queue', 'moderation_queue', 'comments', 'user_preferences',
      'encrypted_keys', 'activity_feed',
      'weekly_tips', 'timeless_facts',
      'forum_questions', 'forum_answers', 'forum_categories',
      'job_postings', 'job_applications', 'job_categories', 'job_saved', 'job_alerts',
      'patients', 'patient_identifiers', 'patient_entity_links',
      'encounters', 'vitals', 'conditions', 'allergies',
      'medication_requests', 'medication_dispenses',
      'lab_orders', 'lab_results', 'imaging_orders',
      'documents', 'care_plans', 'referrals',
      'bed_management', 'staff_schedules', 'triage_notes',
      'pharmacy_inventory', 'pharmacy_orders',
      'insurance_claims', 'billing_items',
      'consents', 'access_grants',
      'ai_chatbot_support',
      'ai_care_paths', 'ai_lab_explanations', 'ai_procedure_navigators',
      'ai_emergency_plans', 'ai_medical_timelines', 'ai_cultural_guidance',
      'ai_photo_analyses', 'ai_care_coordination', 'ai_health_goals', 'ai_family_genetics',
      'verification_requests', 'verification_documents', 'services', 'slot_locks',
      'scheduled_emails', 'carts', 'forum_posts', 'forum_replies',
      'podcast_series', 'podcast_episodes', 'podcast_rss_feeds',
      'disbursements', 'tool_incidents', 'tool_versions', 'unsubscribe_records',
      'session_tokens', 'consent_records', 'data_export_requests',
      'data_deletion_requests', 'search_analytics', 'uptime_checks', 'error_logs',
      'coaching_programs', 'coaching_sessions', 'coaching_clients',
      'entity_integrations', 'entity_analytics',
      'ai_chat_sessions', 'payment_intents',
    ];

    const uniqueCollections = [...new Set(allCollections)];
    for (const col of uniqueCollections) {
      const count = stmts.countCol.get(col) as { count: number };
      if (count.count === 0) {
        // Collection will be created on first insert - no action needed
      }
    }
    console.log(`SQLite: ${uniqueCollections.length} collections ready`);
  }

  subscribe(collection: string, callback: Function): () => void {
    if (!this.subscribers[collection]) this.subscribers[collection] = [];
    this.subscribers[collection].push(callback);
    return () => {
      this.subscribers[collection] = this.subscribers[collection].filter(cb => cb !== callback);
    };
  }

  private notifySubscribers(collection: string) {
    const subs = this.subscribers[collection];
    if (!subs?.length) return;
    const data = this.get(collection);
    subs.forEach(cb => cb(data));
  }

  private validateSchema(collection: string, item: any): void {
    const schema = this.schemas[collection];
    if (!schema) return;
    (schema.required || []).forEach(r => {
      if (!(r in item)) throw new Error(`Missing required field: ${r}`);
    });
  }

  getRawDB(): Database.Database {
    return db;
  }

  backup(destPath: string): void {
    const backup = db.backup(destPath);
    backup.run();
  }

  close(): void {
    db.close();
  }
}

export const sqliteDB = new SQLiteAdapter();
export default SQLiteAdapter;
