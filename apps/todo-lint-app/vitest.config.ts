import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const rootDir = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    dir: rootDir,
  },
  resolve: {
    alias: {
      '@': path.join(rootDir, 'src'),
    },
  },
})
