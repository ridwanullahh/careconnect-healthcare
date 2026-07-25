// Bismillah Ar-Rahman Ar-Raheem.
// @careconnect/db — storage factory selecting between Lightbase (cloud, primary)
// and better-sqlite3 (local, fallback) via the STORAGE_PROVIDER env var.
import { LightbaseStorageAdapter } from './lightbase-adapter.ts';
import type { DBRecord, SchemaDefinition } from './adapter.ts';

export type { DBRecord, SchemaDefinition };
export { LightbaseStorageAdapter };

/**
 * Common storage interface implemented by both adapters so the backend can
 * swap providers without touching route logic.
 */
export interface StorageAdapter {
  get<T = any>(collection: string, force?: boolean): Promise<T[]>;
  find<T = any>(
    collection: string,
    filter?: ((item: T) => boolean) | Record<string, any>,
  ): Promise<T[]>;
  findById<T = any>(collection: string, id: string): Promise<T | null>;
  insert<T = any>(collection: string, item: Partial<T>): Promise<T & DBRecord>;
  update<T = any>(collection: string, key: string, updates: Partial<T>): Promise<T>;
  delete<T = any>(collection: string, key: string): Promise<void>;
  save<T = any>(collection: string, data: T[]): Promise<T[]>;
  initializeAllCollections(): Promise<void>;
  setSchemas(schemas: Record<string, SchemaDefinition>): void;
  subscribe?(collection: string, callback: Function): () => void;
}

let _storage: StorageAdapter | null = null;
let _provider = '';

/**
 * Returns the active storage adapter, selected by STORAGE_PROVIDER env var.
 *   'lightbase' (default) -> LightbaseStorageAdapter (cloud REST /api/v1)
 *   'sqlite'               -> SQLiteAdapter (better-sqlite3 local file)
 *
 * The SQLite adapter is loaded lazily via dynamic import so that running in
 * Lightbase mode does not create a local SQLite file or require the native
 * better-sqlite3 binding at runtime.
 */
export async function getStorage(): Promise<StorageAdapter> {
  if (_storage) return _storage;
  const provider = (process.env.STORAGE_PROVIDER || 'lightbase').toLowerCase().trim();
  _provider = provider;

  if (provider === 'sqlite') {
    // Lazy-load the SQLite adapter only when explicitly selected.
    const mod = await import('./adapter.ts');
    _storage = mod.sqliteDB as unknown as StorageAdapter;
  } else {
    const baseUrl = process.env.LIGHTBASE_BASE_URL;
    const apiKey = process.env.LIGHTBASE_API_KEY;
    const projectId = process.env.LIGHTBASE_PROJECT_ID;
    if (!baseUrl || !apiKey || !projectId) {
      throw new Error(
        'Lightbase storage requires LIGHTBASE_BASE_URL, LIGHTBASE_API_KEY, and LIGHTBASE_PROJECT_ID env vars.',
      );
    }
    const tenant = process.env.LIGHTBASE_TENANT || 'default';
    _storage = new LightbaseStorageAdapter({ baseUrl, apiKey, projectId, tenant });
  }

  console.log(`[storage] provider = ${_provider}`);
  return _storage;
}

/** Returns the name of the active provider (for /api/health). */
export function getProviderName(): string {
  return _provider || (process.env.STORAGE_PROVIDER || 'lightbase').toLowerCase().trim();
}
