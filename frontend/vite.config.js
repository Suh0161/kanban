import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { validateAppEnv } from './vite/validateAppEnv.js'

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  validateAppEnv(env, { command, mode })

  return {
    plugins: [react()],
    server: {
      port: 5173,
      strictPort: true,
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
      },
    },
  }
})
