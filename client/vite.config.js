import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Dev API target; set API_URL (e.g. http://localhost:5001) when port 5000 is taken by another app
const API = process.env.API_URL || 'http://localhost:5000';

export default defineConfig(({ mode }) => ({
  // Optional sub-path for production builds (set VITE_BASE_PATH, e.g. /app/); defaults to domain root
  base: mode === 'production' ? loadEnv(mode, process.cwd(), '').VITE_BASE_PATH || '/' : '/',
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': API,
      '/uploads': API,
    },
  },
  build: {
    chunkSizeWarningLimit: 1200,
  },
}));
