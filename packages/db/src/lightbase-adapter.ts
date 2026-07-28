// Bismillah Ar-Rahman Ar-Raheem.
// LightbaseStorageAdapter — cloud document storage via Lightbase /api/v1.
// Envelope model: each document = { record: <full record json>, <indexed filter fields> }.
// Matches the SQLiteAdapter interface so the backend can switch providers via env.
import crypto from 'node:crypto';

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

// Fields duplicated at the top level (indexed) for efficient server-side filtering.
// All other record fields live inside the `record` json envelope.
const INDEXED_FIELDS = ['email', 'uid', 'user_id', 'entity_id', 'patient_id', 'status'] as const;
type IndexedField = (typeof INDEXED_FIELDS)[number];

const PAGE_LIMIT = 1000;

function isIndexed(field: string): field is IndexedField {
  return (INDEXED_FIELDS as readonly string[]).includes(field);
}

/**
 * Storage adapter that talks to the Lightbase BaaS REST API (/api/v1).
 *
 * Storage model per collection:
 *   document = {
 *     record: <the full CareConnect record as JSON>,
 *     email, uid, user_id, entity_id, patient_id, status  // duplicated for indexed filtering
 *   }
 *
 * The Lightbase document `id` (auto-generated) is used as the record `id`.
 * On read, `id` is injected into the returned record so callers see a flat object
 * identical in shape to what SQLiteAdapter returns.
 */
export class LightbaseStorageAdapter {
  private baseUrl: string;
  private apiKey: string;
  private projectId: string;
  private tenant: string;
  private schemas: Record<string, SchemaDefinition> = {};
  private subscribers: Record<string, Function[]> = {};
  private ensuredCollections = new Set<string>();
  private collectionCheckPromise = new Map<string, Promise<void>>();

  constructor(opts: {
    baseUrl: string;
    apiKey: string;
    projectId: string;
    tenant?: string;
    schemas?: Record<string, SchemaDefinition>;
  }) {
    this.baseUrl = opts.baseUrl.replace(/\/+$/, '');
    this.apiKey = opts.apiKey;
    this.projectId = opts.projectId;
    this.tenant = opts.tenant || 'default';
    if (opts.schemas) this.schemas = opts.schemas;
  }

  setSchemas(schemas: Record<string, SchemaDefinition>) {
    this.schemas = schemas;
  }

  private headers(): Record<string, string> {
    return {
      apikey: this.apiKey,
      'x-lightbase-project': this.projectId,
      'Content-Type': 'application/json',
    };
  }

  private async request<T = any>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${this.baseUrl}/api/v1${path}`;
    const res = await fetch(url, {
      method,
      headers: this.headers(),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let data: any = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }
    if (!res.ok) {
      const errMsg =
        (data && (data.error?.message || data.message)) || `${res.status} ${res.statusText}`;
      const err = new Error(`Lightbase ${method} ${path} failed: ${errMsg}`);
      (err as any).status = res.status;
      (err as any).data = data;
      throw err;
    }
    return data as T;
  }

  /** Build the indexed top-level fields from a record (for envelope duplication). */
  private extractFilterFields(record: Record<string, any>): Record<string, string | null> {
    const out: Record<string, string | null> = {};
    for (const f of INDEXED_FIELDS) {
      const v = record[f];
      out[f] = v != null ? String(v) : null;
    }
    return out;
  }

  /** Convert a stored Lightbase document back into a flat record. */
  private docToRecord(doc: any): any {
    const record = (doc && doc.record) || {};
    return { ...record, id: doc.id, uid: record.uid || doc.uid };
  }

  /** Idempotently ensure a collection exists in Lightbase. Cached per process. */
  async ensureCollection(name: string): Promise<void> {
    if (this.ensuredCollections.has(name)) return;
    // De-duplicate concurrent checks for the same collection.
    let p = this.collectionCheckPromise.get(name);
    if (!p) {
      p = this._ensureCollectionInner(name).then(() => {
        this.ensuredCollections.add(name);
        this.collectionCheckPromise.delete(name);
      });
      this.collectionCheckPromise.set(name, p);
    }
    await p;
  }

  private async _ensureCollectionInner(name: string): Promise<void> {
    // Check existence first (cheap GET).
    try {
      await this.request('GET', `/projects/${this.projectId}/collections/${name}`);
      return; // exists
    } catch (err: any) {
      // 404 means not found; other errors propagate.
      if (err.status !== 404 && !/not found/i.test(err.message)) {
        // If it's a "not found" variant, continue to create. Otherwise rethrow.
        if (err.status !== 404) throw err;
      }
    }
    // Create with envelope schema: one json field + indexed string fields.
    const fields = [
      { name: 'record', type: 'json' as const },
      ...INDEXED_FIELDS.map((f) => ({ name: f, type: 'string' as const, indexed: true })),
    ];
    await this.request('POST', `/projects/${this.projectId}/collections`, { name, fields });
  }

  async initializeAllCollections(): Promise<void> {
    // Lightbase collections are created lazily on first write to avoid 150+ round trips.
    console.log('Lightbase: collections are created lazily on first access.');
  }

  async get<T = any>(collection: string, _force?: boolean): Promise<T[]> {
    await this.ensureCollection(collection);
    const all: any[] = [];
    let cursor: any = null;
    let pages = 0;
    do {
      const params = new URLSearchParams({ limit: String(PAGE_LIMIT) });
      if (cursor) params.set('cursor', JSON.stringify(cursor));
      const res = await this.request<any>(
        'GET',
        `/projects/${this.projectId}/collections/${collection}/docs?${params.toString()}`,
      );
      const data = res.data || [];
      all.push(...data);
      cursor = res.hasMore ? res.nextCursor : null;
      pages++;
      // Safety guard against infinite loops.
      if (pages > 1000) break;
    } while (cursor);
    return all.map((d) => this.docToRecord(d)) as T[];
  }

  async findById<T = any>(collection: string, id: string): Promise<T | null> {
    await this.ensureCollection(collection);
    // Try direct GET by Lightbase document id first.
    try {
      const res = await this.request<any>(
        'GET',
        `/projects/${this.projectId}/collections/${collection}/${encodeURIComponent(id)}`,
      );
      if (res && res.document) return this.docToRecord(res.document) as T;
      if (res && res.id) return this.docToRecord(res) as T;
    } catch (err: any) {
      // fall through to uid lookup
    }
    // Fallback: look up by uid field.
    const params = new URLSearchParams({
      limit: '1',
      filter: JSON.stringify({ field: 'uid', op: 'eq', value: id }),
    });
    const res = await this.request<any>(
      'GET',
      `/projects/${this.projectId}/collections/${collection}/docs?${params.toString()}`,
    );
    const arr = res.data || [];
    return arr.length ? (this.docToRecord(arr[0]) as T) : null;
  }

  async find<T = any>(
    collection: string,
    filter?: ((item: T) => boolean) | Record<string, any>,
  ): Promise<T[]> {
    await this.ensureCollection(collection);
    if (!filter) return this.get<T>(collection);
    if (typeof filter === 'function') {
      const all = await this.get<T>(collection);
      return all.filter(filter);
    }
    const entries = Object.entries(filter);
    if (entries.length === 0) return this.get<T>(collection);

    // If every filter key is an indexed field, use efficient server-side filtering.
    const allIndexed = entries.every(([k]) => isIndexed(k));
    if (allIndexed) {
      const lbFilter =
        entries.length === 1
          ? { field: entries[0][0], op: 'eq', value: entries[0][1] }
          : { and: entries.map(([field, value]) => ({ field, op: 'eq', value })) };
      const all: any[] = [];
      let cursor: any = null;
      let pages = 0;
      do {
        const params = new URLSearchParams({
          limit: String(PAGE_LIMIT),
          filter: JSON.stringify(lbFilter),
        });
        if (cursor) params.set('cursor', JSON.stringify(cursor));
        const res = await this.request<any>(
          'GET',
          `/projects/${this.projectId}/collections/${collection}/docs?${params.toString()}`,
        );
        all.push(...(res.data || []));
        cursor = res.hasMore ? res.nextCursor : null;
        pages++;
        if (pages > 1000) break;
      } while (cursor);
      return all.map((d) => this.docToRecord(d)) as T[];
    }

    // Mixed/non-indexed filter: fetch all and filter client-side (correct, less efficient).
    const all = await this.get<T>(collection);
    return all.filter((record: any) => {
      for (const [key, value] of entries) {
        if (record[key] !== value) return false;
      }
      return true;
    });
  }

  async insert<T = any>(collection: string, item: Partial<T>): Promise<T & DBRecord> {
    await this.ensureCollection(collection);
    const schema = this.schemas[collection];
    let record: any = { ...item };
    if (schema?.defaults) record = { ...schema.defaults, ...record };
    this.validateSchema(collection, record);

    const uid = record.uid || crypto.randomUUID();
    const now = new Date().toISOString();
    // Do not store `id` inside record — Lightbase provides the canonical id.
    const { id: _omit, ...recordWithoutId } = record;
    const storedRecord = { ...recordWithoutId, uid, created_at: now };
    const envelope = {
      record: storedRecord,
      ...this.extractFilterFields(storedRecord),
    };

    const res = await this.request<any>(
      'POST',
      `/projects/${this.projectId}/collections/${collection}`,
      envelope,
    );
    const doc = res.document || res;
    const inserted = { ...storedRecord, id: doc.id } as T & DBRecord;
    this.notifySubscribers(collection);
    return inserted;
  }

  async update<T = any>(collection: string, key: string, updates: Partial<T>): Promise<T> {
    await this.ensureCollection(collection);
    // Resolve the Lightbase document id (and current record) for the given key.
    const { docId, current } = await this.resolveDoc(collection, key);
    if (!docId) throw new Error(`Item with key "${key}" not found in collection "${collection}".`);

    const now = new Date().toISOString();
    const merged: any = { ...current, ...updates, updated_at: now };
    this.validateSchema(collection, merged);
    const { id: _omit, ...recordWithoutId } = merged;
    const envelope = {
      record: recordWithoutId,
      ...this.extractFilterFields(recordWithoutId),
    };

    await this.request<any>(
      'PATCH',
      `/projects/${this.projectId}/collections/${collection}/${encodeURIComponent(docId)}`,
      envelope,
    );
    this.notifySubscribers(collection);
    return { ...recordWithoutId, id: docId } as T;
  }

  async delete<T = any>(collection: string, key: string): Promise<void> {
    await this.ensureCollection(collection);
    const { docId } = await this.resolveDoc(collection, key);
    if (!docId) return; // idempotent: deleting missing item is a no-op
    await this.request<any>(
      'DELETE',
      `/projects/${this.projectId}/collections/${collection}/${encodeURIComponent(docId)}`,
    );
    this.notifySubscribers(collection);
  }

  async save<T = any>(collection: string, data: T[]): Promise<T[]> {
    await this.ensureCollection(collection);
    // Replace all: delete existing docs then insert new ones.
    const existing = await this.get<any>(collection);
    for (const rec of existing) {
      if (rec.id) {
        try {
          await this.request<any>(
            'DELETE',
            `/projects/${this.projectId}/collections/${collection}/${encodeURIComponent(rec.id)}`,
          );
        } catch {
          // ignore individual delete failures
        }
      }
    }
    for (const item of data) {
      await this.insert(collection, item);
    }
    this.notifySubscribers(collection);
    return data;
  }

  subscribe(collection: string, callback: Function): () => void {
    if (!this.subscribers[collection]) this.subscribers[collection] = [];
    this.subscribers[collection].push(callback);
    return () => {
      this.subscribers[collection] = (this.subscribers[collection] || []).filter(
        (cb) => cb !== callback,
      );
    };
  }

  /** Resolve a CareConnect key (Lightbase id or uid) to the Lightbase document id + current record. */
  private async resolveDoc(
    collection: string,
    key: string,
  ): Promise<{ docId: string | null; current: any }> {
    // Try direct GET by id.
    try {
      const res = await this.request<any>(
        'GET',
        `/projects/${this.projectId}/collections/${collection}/${encodeURIComponent(key)}`,
      );
      const doc = res.document || res;
      if (doc && doc.id) {
        return { docId: doc.id, current: this.docToRecord(doc) };
      }
    } catch {
      // fall through
    }
    // Fallback: search by uid.
    const params = new URLSearchParams({
      limit: '1',
      filter: JSON.stringify({ field: 'uid', op: 'eq', value: key }),
    });
    const res = await this.request<any>(
      'GET',
      `/projects/${this.projectId}/collections/${collection}/docs?${params.toString()}`,
    );
    const arr = res.data || [];
    if (arr.length) {
      return { docId: arr[0].id, current: this.docToRecord(arr[0]) };
    }
    return { docId: null, current: null };
  }

  private notifySubscribers(collection: string) {
    const subs = this.subscribers[collection];
    if (!subs?.length) return;
    this.get(collection)
      .then((data) => subs.forEach((cb) => cb(data)))
      .catch(() => {});
  }

  private validateSchema(collection: string, item: any): void {
    const schema = this.schemas[collection];
    if (!schema) return;
    (schema.required || []).forEach((r) => {
      if (!(r in item)) throw new Error(`Missing required field: ${r}`);
    });
  }

  /** Health probe used by /api/health. */
  async ping(): Promise<{ ok: boolean; provider: string; projectId: string }> {
    try {
      await this.request('GET', `/projects/${this.projectId}`);
      return { ok: true, provider: 'lightbase', projectId: this.projectId };
    } catch {
      return { ok: false, provider: 'lightbase', projectId: this.projectId };
    }
  }
}

export default LightbaseStorageAdapter;
