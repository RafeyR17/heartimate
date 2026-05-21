import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { defineConfig } from 'vitest/config'

/** Load env before integration test modules import (canRun checks run at import time). */
function loadEnvFile(filename: string): void {
  const filePath = path.resolve(process.cwd(), filename)
  if (!existsSync(filePath)) return
  for (const line of readFileSync(filePath, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq <= 0) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (process.env[key] === undefined) process.env[key] = value
  }
}

loadEnvFile('.env')
loadEnvFile('.env.local')
process.env.INTEGRATION_TEST ??= '1'

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./vitest.setup.ts', './vitest.integration.setup.ts'],
    include: ['tests/integration/**/*.test.ts'],
    testTimeout: 30_000,
    pool: 'threads',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
