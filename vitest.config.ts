import path from 'node:path'
import { defineConfig } from 'vitest/config'

// Deliberately does NOT reuse vite.config.ts — that pulls in the TanStack Start,
// Cloudflare and content-collections plugins, which aren't needed (and are slow
// / environment-sensitive) for unit tests.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
    globals: false,
  },
  resolve: {
    alias: {
      '#': path.resolve(import.meta.dirname, 'src'),
      '@': path.resolve(import.meta.dirname, 'src'),
    },
  },
})
