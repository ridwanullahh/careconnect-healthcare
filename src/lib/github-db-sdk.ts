// Real GitHub DB SDK Implementation
// Based on the provided comprehensive SDK specification

interface CloudinaryConfig {
  uploadPreset?: string;
  cloudName?: string;
  apiKey?: string;
  apiSecret?: string;
}

interface SMTPConfig {
  endpoint?: string;
  from?: string;
  test?: () => Promise<boolean>;
}

interface AuthConfig {
  requireEmailVerification?: boolean;
  otpTriggers?: string[];
}

interface SchemaDefinition {
  required?: string[];
  types?: Record<string, string>;
  defaults?: Record<string, any>;
}

interface UniversalSDKConfig {
  owner: string;
  repo: string;
  token: string;
  branch?: string;
  basePath?: string;
  mediaPath?: string;
  cloudinary?: CloudinaryConfig;
  smtp?: SMTPConfig;
  templates?: Record<string, string>;
  schemas?: Record<string, SchemaDefinition>;
  auth?: AuthConfig;
}

interface User {
  id?: string;
  uid?: string;
  email: string;
  password?: string;
  googleId?: string;
  verified?: boolean;
  roles?: string[];
  permissions?: string[];
  [key: string]: any;
}

interface Session {
  token: string;
  user: User;
  created: number;
}

interface OTPRecord {
  otp: string;
  created: number;
  reason: string;
}

interface AuditLogEntry {
  action: string;
  data: any;
  timestamp: number;
}

interface QueryBuilder<T = any> {
  where(fn: (item: T) => boolean): QueryBuilder<T>;
  sort(field: string, dir?: 'asc' | 'desc'): QueryBuilder<T>;
  project(fields: string[]): QueryBuilder<Partial<T>>;
  exec(): Promise<T[]>;
}

interface CloudinaryUploadResult {
  public_id: string;
  secure_url: string;
  url: string;
  [key: string]: any;
}

interface QueuedWrite {
  collection: string;
  data: any[];
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
  retries: number;
}

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  from: string;
  headers: Record<string, string>;
}

class UniversalSDK {
  private owner: string;
  private repo: string;
  private token: string;
  private branch: string;
  private basePath: string;
  private mediaPath: string;
  private cloudinary: CloudinaryConfig;
  private smtp: SMTPConfig;
  private templates: Record<string, string>;
  private schemas: Record<string, SchemaDefinition>;
  private authConfig: AuthConfig;
  private sessionStore: Record<string, Session>;
  private otpMemory: Record<string, OTPRecord>;
  private auditLog: Record<string, AuditLogEntry[]>;
  private cache: Record<string, { data: any[], etag?: string, sha?: string }> = {};
  private subscribers: Record<string, Function[]> = {};
  private pollingIntervals: Record<string, number> = {};
  private writeQueue: QueuedWrite[] = [];
  private isProcessingQueue = false;

  constructor(config: UniversalSDKConfig) {
    this.owner = config.owner;
    this.repo = config.repo;
    this.token = config.token;
    this.branch = config.branch || "main";
    this.basePath = config.basePath || "db";
    this.mediaPath = config.mediaPath || "media";
    this.cloudinary = config.cloudinary || {};
    this.smtp = config.smtp || {};
    this.templates = config.templates || {};
    this.schemas = {
      // Core CareConnect Collections
      users: {
        required: ['email'],
        types: {
          email: 'string',
          user_type: 'string',
          is_verified: 'boolean',
          is_active: 'boolean'
        },
        defaults: {
          is_verified: false,
          is_active: true,
          permissions: []
        }
      },
      entities: {
        required: ['name', 'entity_type'],
        types: {
          name: 'string',
          entity_type: 'string',
          verification_status: 'string',
          is_active: 'boolean'
        },
        defaults: {
          verification_status: 'unverified',
          is_active: true,
          badges: [],
          rating: 0,
          review_count: 0
        }
      },
      health_tools: {
        required: ['name', 'category', 'type'],
        types: {
          name: 'string',
          category: 'string',
          type: 'string',
          usage_count: 'number',
          rating: 'number',
          is_active: 'boolean'
        },
        defaults: {
          usage_count: 0,
          rating: 0,
          is_active: true,
          requires_login: false
        }
      },
      courses: {
        required: ['title', 'entity_id'],
        types: {
          title: 'string',
          entity_id: 'string',
          price: 'number',
          is_published: 'boolean'
        },
        defaults: {
          price: 0,
          is_published: false,
          enrollment_count: 0
        }
      },
      ...config.schemas,
      course_modules: {
        required: ['course_id', 'title'],
        types: {
          course_id: 'string',
          title: 'string',
        },
        defaults: {
          lessons: [],
        }
      },
      course_lessons: {
        required: ['module_id', 'title', 'type'],
        types: {
          module_id: 'string',
          title: 'string',
          type: 'string',
        },
        defaults: {
          is_preview: false,
        }
      },
      chat_sessions: {
        required: ['userId', 'name', 'messages'],
        types: {
          userId: 'string',
          name: 'string',
        },
        defaults: {
          messages: [],
          createdAt: new Date().toISOString(),
          lastActivity: new Date().toISOString(),
        }
      },
      ai_chatbot_support: {
        required: ['topic', 'keywords'],
        types: {
          topic: 'string',
          keywords: 'array',
          response: 'string',
        },
        defaults: {
          keywords: [],
        }
      },
      blog_posts: {
        required: ['title', 'content', 'author'],
        types: {
          title: 'string',
          content: 'string',
        }
      },
      causes: {
        required: ['title', 'description', 'goal_amount'],
        types: {
          title: 'string',
          description: 'string',
          goal_amount: 'number',
        }
      },
      forum_posts: {
        required: ['title', 'content', 'author'],
        types: {
          title: 'string',
          content: 'string',
        }
      },
      news_articles: {
        required: ['title', 'content', 'source'],
        types: {
          title: 'string',
          content: 'string',
          source: 'string',
        }
      },
      newsletter_subscriptions: {
        required: ['email'],
        types: {
          email: 'string',
        }
      },
      products: {
        required: ['name', 'price', 'stock_quantity'],
        types: {
          name: 'string',
          price: 'number',
          stock_quantity: 'number',
        }
      },
      orders: {
        required: ['user_id', 'items', 'total_amount'],
        types: {
          user_id: 'string',
          total_amount: 'number',
        }
      },
      order_items: {
        required: ['order_id', 'product_id', 'quantity', 'unit_price'],
        types: {
          order_id: 'string',
          product_id: 'string',
          quantity: 'number',
          unit_price: 'number',
        }
      },
      
      // Hospital Management System collections
      patients: {
        required: ['patient_code', 'primary_entity_id', 'created_by'],
        types: {
          patient_code: 'string',
          primary_entity_id: 'string',
          is_active: 'boolean',
          verification_status: 'string'
        },
        defaults: {
          is_active: true,
          verification_status: 'pending',
          preferences: {
            language: 'en',
            communication_method: 'email',
            privacy_level: 'standard'
          }
        }
      },
      patient_identifiers: {
        required: ['patient_id', 'type', 'encrypted_value'],
        types: {
          patient_id: 'string',
          type: 'string',
          is_primary: 'boolean'
        },
        defaults: {
          is_primary: false
        }
      },
      patient_entity_links: {
        required: ['patient_id', 'entity_id', 'relationship_type', 'linked_by'],
        types: {
          patient_id: 'string',
          entity_id: 'string',
          relationship_type: 'string',
          status: 'string'
        },
        defaults: {
          status: 'active'
        }
      },
      encounters: {
        required: ['patient_id', 'entity_id', 'encounter_code', 'type', 'reason_for_visit', 'created_by'],
        types: {
          patient_id: 'string',
          entity_id: 'string',
          encounter_code: 'string',
          type: 'string',
          status: 'string',
          priority: 'string'
        },
        defaults: {
          status: 'scheduled',
          priority: 'routine'
        }
      },
      vitals: {
        required: ['patient_id', 'entity_id', 'type', 'display_name', 'performer_id'],
        types: {
          patient_id: 'string',
          entity_id: 'string',
          type: 'string',
          is_abnormal: 'boolean'
        },
        defaults: {
          is_abnormal: false
        }
      },
      conditions: {
        required: ['patient_id', 'entity_id', 'condition_name', 'category', 'recorded_by'],
        types: {
          patient_id: 'string',
          entity_id: 'string',
          condition_name: 'string',
          category: 'string',
          clinical_status: 'string',
          verification_status: 'string'
        },
        defaults: {
          clinical_status: 'active',
          verification_status: 'provisional'
        }
      },
      allergies: {
        required: ['patient_id', 'entity_id', 'allergen', 'recorded_by'],
        types: {
          patient_id: 'string',
          entity_id: 'string',
          allergen: 'string',
          criticality: 'string',
          status: 'string'
        },
        defaults: {
          criticality: 'low',
          status: 'active'
        }
      },
      medication_requests: {
        required: ['patient_id', 'entity_id', 'prescriber_id', 'prescription_number', 'medications'],
        types: {
          patient_id: 'string',
          entity_id: 'string',
          prescriber_id: 'string',
          prescription_number: 'string',
          status: 'string',
          intent: 'string',
          priority: 'string'
        },
        defaults: {
          status: 'active',
          intent: 'order',
          priority: 'routine'
        }
      },
      medication_dispenses: {
        required: ['medication_request_id', 'pharmacy_entity_id', 'patient_id'],
        types: {
          medication_request_id: 'string',
          pharmacy_entity_id: 'string',
          patient_id: 'string',
          status: 'string',
          type: 'string'
        },
        defaults: {
          status: 'preparation',
          type: 'trial_fill',
          counseling_provided: false,
          patient_acknowledged: false
        }
      },
      lab_orders: {
        required: ['patient_id', 'entity_id', 'orderer_id', 'order_number', 'tests', 'reason_for_test'],
        types: {
          patient_id: 'string',
          entity_id: 'string',
          orderer_id: 'string',
          order_number: 'string',
          status: 'string',
          priority: 'string',
          category: 'string'
        },
        defaults: {
          status: 'requested',
          priority: 'routine',
          category: 'chemistry',
          specimen_collected: false
        }
      },
      lab_results: {
        required: ['lab_order_id', 'patient_id', 'test_name', 'analytes', 'resulted_by'],
        types: {
          lab_order_id: 'string',
          patient_id: 'string',
          test_name: 'string',
          status: 'string',
          critical_value: 'boolean'
        },
        defaults: {
          status: 'preliminary',
          critical_value: false,
          released_to_patient: false
        }
      },
      imaging_orders: {
        required: ['patient_id', 'entity_id', 'orderer_id', 'order_number', 'modality', 'study_description', 'body_part', 'clinical_info', 'reason_for_study'],
        types: {
          patient_id: 'string',
          entity_id: 'string',
          orderer_id: 'string',
          order_number: 'string',
          status: 'string',
          priority: 'string',
          modality: 'string'
        },
        defaults: {
          status: 'requested',
          priority: 'routine',
          contrast_required: false
        }
      },
      documents: {
        required: ['patient_id', 'document_type', 'title'],
        types: {
          patient_id: 'string',
          document_type: 'string',
          title: 'string',
          file_size: 'number'
        },
        defaults: {
          file_size: 0,
          is_encrypted: false
        }
      },
      care_plans: {
        required: ['patient_id', 'entity_id', 'title', 'description', 'category', 'created_by'],
        types: {
          patient_id: 'string',
          entity_id: 'string',
          title: 'string',
          category: 'string',
          status: 'string',
          intent: 'string'
        },
        defaults: {
          status: 'draft',
          intent: 'plan',
          goals: [],
          activities: [],
          care_team: []
        }
      },
      referrals: {
        required: ['patient_id', 'from_entity_id', 'to_entity_id', 'referring_provider_id', 'referral_number', 'type', 'reason_for_referral', 'clinical_summary', 'created_by'],
        types: {
          patient_id: 'string',
          from_entity_id: 'string',
          to_entity_id: 'string',
          referral_number: 'string',
          type: 'string',
          priority: 'string',
          status: 'string'
        },
        defaults: {
          status: 'draft',
          priority: 'routine',
          follow_up_required: false
        }
      },
      bed_management: {
        required: ['entity_id', 'ward', 'room_number', 'bed_number', 'bed_type'],
        types: {
          entity_id: 'string',
          ward: 'string',
          room_number: 'string',
          bed_number: 'string',
          bed_type: 'string',
          status: 'string'
        },
        defaults: {
          status: 'available',
          features: []
        }
      },
      staff_schedules: {
        required: ['entity_id', 'staff_id', 'schedule_date', 'shift_start', 'shift_end'],
        types: {
          entity_id: 'string',
          staff_id: 'string',
          schedule_date: 'string',
          shift_start: 'string',
          shift_end: 'string',
          is_available: 'boolean'
        },
        defaults: {
          is_available: true
        }
      },
      triage_notes: {
        required: ['patient_id', 'encounter_id', 'entity_id', 'acuity_level', 'chief_complaint', 'triage_nurse_id'],
        types: {
          patient_id: 'string',
          encounter_id: 'string',
          entity_id: 'string',
          acuity_level: 'string'
        },
        defaults: {
          acuity_level: 'routine'
        }
      },
      pharmacy_inventory: {
        required: ['entity_id', 'drug_name', 'strength', 'dosage_form', 'quantity_on_hand', 'unit_of_measure', 'minimum_stock_level', 'unit_cost', 'selling_price'],
        types: {
          entity_id: 'string',
          drug_name: 'string',
          quantity_on_hand: 'number',
          unit_cost: 'number',
          selling_price: 'number',
          is_active: 'boolean',
          is_controlled_substance: 'boolean'
        },
        defaults: {
          is_active: true,
          is_controlled_substance: false,
          lot_batches: []
        }
      },
      pharmacy_orders: {
        required: ['entity_id', 'order_number', 'supplier_name', 'order_date', 'expected_delivery', 'items', 'ordered_by'],
        types: {
          entity_id: 'string',
          order_number: 'string',
          supplier_name: 'string',
          status: 'string',
          subtotal: 'number',
          total_amount: 'number'
        },
        defaults: {
          status: 'pending',
          subtotal: 0,
          tax_amount: 0,
          shipping_cost: 0,
          total_amount: 0
        }
      },
      insurance_claims: {
        required: ['patient_id', 'entity_id', 'encounter_id', 'claim_number', 'claim_type', 'insurance_provider', 'policy_number', 'member_id', 'claimed_amount', 'services', 'created_by'],
        types: {
          patient_id: 'string',
          entity_id: 'string',
          claim_number: 'string',
          claim_type: 'string',
          status: 'string',
          claimed_amount: 'number'
        },
        defaults: {
          status: 'draft'
        }
      },
      billing_items: {
        required: ['encounter_id', 'patient_id', 'entity_id', 'service_name', 'category', 'quantity', 'unit_price', 'created_by'],
        types: {
          encounter_id: 'string',
          patient_id: 'string',
          entity_id: 'string',
          service_name: 'string',
          category: 'string',
          quantity: 'number',
          unit_price: 'number',
          total_amount: 'number',
          status: 'string'
        },
        defaults: {
          status: 'pending',
          discount_amount: 0,
          tax_amount: 0
        }
      },
      consents: {
        required: ['patient_id', 'entity_id', 'consent_type', 'scope', 'purpose', 'consent_text', 'granted_by', 'obtained_by'],
        types: {
          patient_id: 'string',
          entity_id: 'string',
          consent_type: 'string',
          scope: 'string',
          status: 'string'
        },
        defaults: {
          status: 'pending'
        }
      },
      access_grants: {
        required: ['patient_id', 'grantee_type', 'grantee_name', 'encrypted_grantee_contact', 'access_level', 'scope', 'granted_by'],
        types: {
          patient_id: 'string',
          grantee_type: 'string',
          grantee_name: 'string',
          access_level: 'string',
          status: 'string',
          emergency_only: 'boolean',
          require_patient_approval: 'boolean'
        },
        defaults: {
          status: 'pending',
          emergency_only: false,
          require_patient_approval: false,
          can_view_records: false,
          can_schedule_appointments: false,
          can_receive_notifications: false,
          can_communicate_with_providers: false,
          pin_required: false
        }
      },
    };
    this.authConfig = config.auth || { requireEmailVerification: true, otpTriggers: ["register"] };
    this.sessionStore = {};
    this.otpMemory = {};
    this.auditLog = {};
  }

  private encode(str: string): string {
    // Convert Unicode string to Base64 (UTF-8 safe)
    return btoa(unescape(encodeURIComponent(str)));
  }

  private decode(str: string): string {
    // Convert Base64 to Unicode string (UTF-8 safe)
    return decodeURIComponent(escape(atob(str)));
  }

  private headers(): Record<string, string> {
    return {
      Authorization: `token ${this.token}`,
      "Content-Type": "application/json",
    };
  }

  private async request(path: string, method: string = "GET", body: any = null, etag?: string): Promise<any> {
    const url = `https://api.github.com/repos/${this.owner}/${this.repo}/contents/${path}` +
                (method === "GET" ? `?ref=${this.branch}` : "");
    
    const headers = this.headers();
    if (etag) {
      headers["If-None-Match"] = etag;
    }

    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : null,
    });

    if (res.status === 304) {
      return { notModified: true };
    }

    if (!res.ok) {
      const error = await res.text();
      console.error('GitHub API Error:', error);
      throw new Error(`GitHub API Error: ${res.status} ${error}`);
    }
    
    if (res.status === 204 || res.status === 201) {
        return { success: true, ...await res.json() };
    }

    const json = await res.json();
    return { ...json, etag: res.headers.get("ETag") };
  }

  async get<T = any>(collection: string, force = false): Promise<T[]> {
    const cacheEntry = this.cache[collection];
    if (cacheEntry && !force) {
      return cacheEntry.data;
    }

    try {
      const res = await this.request(`${this.basePath}/${collection}.json`, "GET", null, cacheEntry?.etag);
      if (res.notModified && cacheEntry) {
        return cacheEntry.data;
      }
      const data = JSON.parse(this.decode(res.content));
      this.cache[collection] = { data, etag: res.etag, sha: res.sha };
      this.notifySubscribers(collection, data);
      return data;
    } catch (e) {
      const error = e as Error;
      if (error.message.includes("Not Found") || error.message.includes("404")) {
        // Initialize empty collection
        const initialData: T[] = [];
        await this.initializeCollection(collection, initialData);
        this.cache[collection] = { data: initialData, etag: undefined, sha: undefined };
        return initialData;
      }
      throw e;
    }
  }

  private async initializeCollection<T = any>(collection: string, data: T[]): Promise<void> {
    try {
      await this.request(`${this.basePath}/${collection}.json`, "PUT", {
        message: `Initialize ${collection} collection`,
        content: this.encode(JSON.stringify(data, null, 2)),
        branch: this.branch,
      });
    } catch (error) {
      console.warn(`Could not initialize collection ${collection}:`, error);
    }
  }

  private notifySubscribers(collection: string, data: any[]) {
    (this.subscribers[collection] || []).forEach(cb => cb(data));
  }

  async insert<T = any>(collection: string, item: Partial<T>): Promise<T & { id: string; uid: string }> {
    const arr = await this.get<T>(collection);
    const schema = this.schemas[collection];
    if (schema?.defaults) item = { ...schema.defaults, ...item };
    this.validateSchema(collection, item);
    const id = (Math.max(0, ...arr.map((x: any) => +x.id || 0)) + 1).toString();
    const newItem = { uid: crypto.randomUUID(), id, ...item } as T & { id: string; uid: string };
    arr.push(newItem);
    await this.save(collection, arr);
    this._audit(collection, newItem, "insert");
    return newItem;
  }

  private async save<T = any>(collection: string, data: T[]): Promise<T[]> {
    return new Promise((resolve, reject) => {
      // Optimistic update
      this.cache[collection] = { ...this.cache[collection], data };
      this.notifySubscribers(collection, data);
      
      this.writeQueue.push({
        collection,
        data,
        resolve,
        reject,
        retries: 0
      });
      
      if (!this.isProcessingQueue) {
        this.processQueue();
      }
    });
  }

  private async processQueue() {
    if (this.isProcessingQueue || this.writeQueue.length === 0) {
      return;
    }
    this.isProcessingQueue = true;
    const write = this.writeQueue[0];

    try {
      const { collection, data, resolve } = write;
      // Always fetch latest sha before writing
      const file = await this.request(`${this.basePath}/${collection}.json`).catch(() => ({ sha: undefined }));
      
      await this.request(`${this.basePath}/${collection}.json`, "PUT", {
          message: `Update ${collection} - ${new Date().toISOString()}`,
          content: this.encode(JSON.stringify(data, null, 2)),
          branch: this.branch,
          sha: file.sha,
      });

      this.writeQueue.shift(); // Remove from queue on success
      this.get(collection, true); // Force-fetch latest data after successful write
      resolve(data);
    } catch (error: any) {
        if (error.message.includes("409") && write.retries < 5) { // Conflict
            write.retries++;
            // Don't remove from queue, will retry on next process tick
        } else {
            write.reject(error);
            this.writeQueue.shift(); // Remove from queue on hard failure
        }
    } finally {
        this.isProcessingQueue = false;
        // Immediately process next item
        if (this.writeQueue.length > 0) {
          setTimeout(() => this.processQueue(), 250);
        }
    }
  }

  private validateSchema(collection: string, item: any): void {
    const schema = this.schemas[collection];
    if (!schema) return;
    (schema.required || []).forEach(r => {
      if (!(r in item)) throw new Error(`Missing required field: ${r}`);
    });
  }

  private _audit(collection: string, data: any, action: string): void {
    const logs = this.auditLog[collection] || [];
    logs.push({ action, data, timestamp: Date.now() });
    this.auditLog[collection] = logs.slice(-100);
  }

  async findById<T = any>(collection: string, id: string): Promise<T | null> {
    const arr = await this.get<T>(collection);
    return arr.find((x: any) => x.id === id || x.uid === id) || null;
  }

  async find<T = any>(collection: string, filterFnOrObject?: ((item: T) => boolean) | Record<string, any>): Promise<T[]> {
    const arr = await this.get<T>(collection);

    // If no filter provided, return all
    if (filterFnOrObject === undefined || filterFnOrObject === null) {
      return arr;
    }

    if (typeof filterFnOrObject === 'function') {
      return arr.filter(filterFnOrObject as (item: T) => boolean);
    }
    
    // Object-based filter
    return arr.filter(record => {
      for (const [key, value] of Object.entries(filterFnOrObject || {})) {
        if ((record as any)[key] !== value) {
          return false;
        }
      }
      return true;
    });
  }

  async update<T = any>(collection: string, key: string, updates: Partial<T>): Promise<T> {
    await this.get(collection, true); // Ensure we have latest data
    const arr = [...(this.cache[collection]?.data || [])];
    
    const itemIndex = arr.findIndex((x: any) => x.id === key || x.uid === key);
    if (itemIndex === -1) {
      throw new Error(`Item with key "${key}" not found in collection "${collection}".`);
    }

    const updatedItem = { ...arr[itemIndex], ...updates, updated_at: new Date().toISOString() };
    this.validateSchema(collection, updatedItem);
    arr[itemIndex] = updatedItem;

    await this.save(collection, arr);
    this._audit(collection, updatedItem, "update");
    return updatedItem;
  }

  async delete<T = any>(collection: string, key: string): Promise<void> {
    const arr = await this.get<T>(collection);
    const filtered = arr.filter((x: any) => x.id !== key && x.uid !== key);
    const deleted = arr.filter((x: any) => x.id === key || x.uid === key);
    await this.save(collection, filtered);
    deleted.forEach(d => this._audit(collection, d, "delete"));
  }

  // Initialize all collections with seed data
  async initializeAllCollections(): Promise<void> {
    const collections = Object.keys(this.schemas);
    console.log('Initializing GitHub DB collections:', collections);
    
    for (const collection of collections) {
      try {
        await this.get(collection, false); // This will create collection if not exists
      } catch (error) {
        console.warn(`Failed to initialize collection ${collection}:`, error);
      }
    }
    
    console.log('GitHub DB initialization completed');
  }
}

// Export the SDK class and configuration
export default UniversalSDK;
export type { 
  UniversalSDKConfig, 
  CloudinaryConfig, 
  SMTPConfig, 
  AuthConfig, 
  SchemaDefinition, 
  User, 
  Session, 
  QueryBuilder,
  CloudinaryUploadResult
};

// Create and export the configured SDK instance
const sdkConfig: UniversalSDKConfig = {
  owner: import.meta.env.VITE_GITHUB_OWNER,
  repo: import.meta.env.VITE_GITHUB_REPO,
  token: import.meta.env.VITE_GITHUB_TOKEN,
  branch: 'main',
  basePath: 'db',
  cloudinary: {
    cloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME,
    uploadPreset: import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET
  },
  templates: {
    otp: 'Your CareConnect verification code: {{otp}}. Valid for 10 minutes.',
    welcome: 'Welcome to CareConnect! Your account has been created successfully.'
  }
};

export const githubDB = new UniversalSDK(sdkConfig);