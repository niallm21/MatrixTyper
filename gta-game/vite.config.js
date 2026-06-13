import { defineConfig } from 'vite';

// Relative base so the bundle works when loaded from a file:// / capacitor:// origin
// inside the Android WebView.
export default defineConfig({
  base: './',
  build: {
    target: 'es2019',
    outDir: 'dist',
    emptyOutDir: true,
  },
});
