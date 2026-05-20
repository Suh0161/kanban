import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { validateElevateEnv } from './vite/validateElevateEnv.js';

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  validateElevateEnv(env, { command, mode });

  return {
    plugins: [react()],
    server: {
      port: 5174,
      strictPort: true,
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
      },
    },
  };
});
