// Bismillah Ar-Rahman Ar-Raheem.
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import { loadEnv } from 'vite';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Resolve the @careconnect/db workspace package's TypeScript entry correctly.
// The old alias used '../packages/db/...' relative to apps/backend, which
// resolves to apps/packages/db — ONE LEVEL SHORT — so every build outside the
// original authoring environment failed with ENOENT. Preferred path: the npm
// workspace symlink (layout-independent); fallback: correct two-level climb.
const dbEntry = (() => {
  try {
    const resolved = fileURLToPath(import.meta.resolve('@careconnect/db'));
    if (fs.existsSync(resolved)) return resolved;
  } catch {
    /* fall through to the relative path */
  }
  return path.resolve(__dirname, '../../packages/db/src/index.ts');
})();

// Load all env vars (no prefix filter) from apps/backend/.env into process.env
// so server-side code (storage factory, route handlers) can read them via process.env.
const env = loadEnv(process.env.NODE_ENV || 'development', __dirname, '');
for (const [key, value] of Object.entries(env)) {
  if (process.env[key] === undefined) {
    process.env[key] = value;
  }
}

export default defineConfig({
  output: 'server',
  adapter: node({
    mode: 'standalone',
  }),
  server: {
    port: 4321,
    host: true,
  },
  vite: {
    resolve: {
      alias: {
        '@careconnect/db': dbEntry,
      },
    },
  },
});
