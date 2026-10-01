import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    root: fileURLToPath(new URL('.', import.meta.url)),
    plugins: [react()],
    envDir: process.cwd(),
    build: { outDir: 'dist', emptyOutDir: true },
    server: {
      host: '127.0.0.1',
      port: 5173,
      strictPort: true,
      proxy: { '/api': `http://127.0.0.1:${env.PORT || process.env.PORT || 3001}` },
    },
  };
});
