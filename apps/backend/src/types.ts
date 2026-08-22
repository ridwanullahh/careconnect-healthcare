// Bismillah Ar-Rahman Ar-Raheem.
// Shared types for the storage adapter interface (platform-agnostic).
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

export interface StorageAdapter {
  get<T = any>(collection: string, force?: boolean): Promise<T[]>;
  find<T = any>(collection: string, filter?: ((item: T) => boolean) | Record<string, any>): Promise<T[]>;
  findById<T = any>(collection: string, id: string): Promise<T | null>;
  insert<T = any>(collection: string, item: Partial<T>): Promise<T & DBRecord>;
  update<T = any>(collection: string, key: string, updates: Partial<T>): Promise<T>;
  delete<T = any>(collection: string, key: string): Promise<void>;
  save<T = any>(collection: string, data: T[]): Promise<T[]>;
  initializeAllCollections(): Promise<void>;
  setSchemas(schemas: Record<string, SchemaDefinition>): void;
  subscribe?(collection: string, callback: Function): () => void;
}
