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

  async find<T = any>(collection: string, filters: any = {}): Promise<T[]> {
    const arr = await this.get<T>(collection);
    return arr.filter(record => {
      for (const [key, value] of Object.entries(filters)) {
        if (record[key as keyof T] !== value) {
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