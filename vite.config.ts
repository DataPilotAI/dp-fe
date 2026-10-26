import react from '@vitejs/plugin-react'
import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget = env.PROXY_TARGET || 'http://localhost:8080'

  return {
    // Only these prefixes reach the browser bundle; PROXY_TARGET stays server-side.
    envPrefix: ['DP_'],
    plugins: [react()],
    server: {
      proxy: { '/api': { target: apiTarget, changeOrigin: true } },
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['@testing-library/jest-dom/vitest'],
    },
  }
})
