import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: [
      {
        find: /^@wm\/shared$/,
        replacement: fileURLToPath(new URL('../../packages/shared/src/index.ts', import.meta.url)),
      },
    ],
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    fs: { allow: ['../..', '../../packages/shared'] },
    allowedHosts: true,
    hmr: { clientPort: 443 },
    proxy: {
      '/auth': { target: 'http://localhost:8000', changeOrigin: true },
      '/user': { target: 'http://localhost:8000', changeOrigin: true },
      '/collector': { target: 'http://localhost:8000', changeOrigin: true },
      '/recycler': { target: 'http://localhost:8000', changeOrigin: true },
      '/management': { target: 'http://localhost:8000', changeOrigin: true },
      '/rewards': { target: 'http://localhost:8000', changeOrigin: true },
      '/vouchers': { target: 'http://localhost:8000', changeOrigin: true },
      '/health': { target: 'http://localhost:8000', changeOrigin: true },
      '/uploads': { target: 'http://localhost:8000', changeOrigin: true },
      '/docs': { target: 'http://localhost:8000', changeOrigin: true },
      '/openapi.json': { target: 'http://localhost:8000', changeOrigin: true },
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true as any,
    proxy: {
      '/auth': { target: 'http://localhost:8000', changeOrigin: true },
      '/user': { target: 'http://localhost:8000', changeOrigin: true },
      '/collector': { target: 'http://localhost:8000', changeOrigin: true },
      '/recycler': { target: 'http://localhost:8000', changeOrigin: true },
      '/management': { target: 'http://localhost:8000', changeOrigin: true },
      '/rewards': { target: 'http://localhost:8000', changeOrigin: true },
      '/vouchers': { target: 'http://localhost:8000', changeOrigin: true },
      '/health': { target: 'http://localhost:8000', changeOrigin: true },
      '/uploads': { target: 'http://localhost:8000', changeOrigin: true },
      '/docs': { target: 'http://localhost:8000', changeOrigin: true },
      '/openapi.json': { target: 'http://localhost:8000', changeOrigin: true },
    },
  },
});
