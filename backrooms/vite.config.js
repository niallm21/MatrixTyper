import { defineConfig } from 'vite';

// base './' so all asset URLs are relative — required for the Capacitor
// WebView which loads the app from the local filesystem (capacitor://).
export default defineConfig({
  base: './',
  build: {
    target: 'es2020',
    outDir: 'dist',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 2000,
  },
  server: {
    host: true,
    port: 5173,
  },
});
