import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '')

  // Use HTTPS only if the environment variable is explicitly set to 'true'
  const useHttps = env.VITE_DEV_SERVER_HTTPS === 'true'

  return {
    plugins: [
      react(),
      // Conditionally add the SSL plugin
      useHttps && basicSsl(),
    ].filter(Boolean), // Remove any falsy values from the plugins array
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 3000,
      host: true,
      // Conditionally enable HTTPS for the dev server
      https: useHttps,
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            router: ['react-router-dom'],
            icons: ['lucide-react'],
          },
        },
      },
      minify: 'terser',
      terserOptions: {
        compress: {
          // Keep console logs in development, but drop them in production
          drop_console: mode === 'production',
          drop_debugger: mode === 'production',
        },
      },
    },
  }
})