import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: process.env.ELECTRON == 'true' ? './' : '/',
  build: {
    outDir: 'dist',
  },
  server: {
    port: 3000,
  }
});
