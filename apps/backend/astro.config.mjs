import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

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
        '@careconnect/db': '../packages/db/src',
      },
    },
  },
});
