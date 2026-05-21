import path from 'node:path'
import { defineConfig } from 'vitest/config'

/** OpenRouter live eval — requires OPENROUTER_API_KEY (see tests/llm-eval/load-env.ts). */
export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    include: ['tests/llm-eval/live.test.ts'],
    pool: 'threads',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
