import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: process.env.ELECTRON == 'true' ? './' : '/',
  build: {
    outDir: 'dist',
    target: 'chrome120',
  },
  optimizeDeps: {
    // Exclude ESM-only packages from pre-bundling; Vite will import them directly
    exclude: ['@tidal-music/player', '@tidal-music/player-web-components', '@tidal-music/auth', '@tidal-music/common'],
  },
  server: {
    port: 3000,
  }
});
