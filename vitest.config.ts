import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    include: [
      'lib/**/*.test.ts',
      'app/api/**/*.test.ts',
      'tests/security/**/*.test.ts',
      'tests/llm-eval/**/*.test.ts',
    ],
    // Live OpenRouter calls: npm run test:llm-eval:live only
    exclude: ['tests/llm-eval/live.test.ts'],
    pool: 'threads',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
