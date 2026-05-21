import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

/** Load OPENROUTER_* from repo root env files (does not override existing env). */
export function loadLlmEvalEnv(rootDir = join(__dirname, '../..')): void {
  for (const name of ['.env.local', '.env']) {
    const path = join(rootDir, name)
    if (!existsSync(path)) continue
    const raw = readFileSync(path, 'utf8')
    for (const line of raw.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq <= 0) continue
      const key = trimmed.slice(0, eq).trim()
      if (!key.startsWith('OPENROUTER_') && key !== 'NEXT_PUBLIC_APP_URL') continue
      if (process.env[key]) continue
      let value = trimmed.slice(eq + 1).trim()
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      }
      process.env[key] = value
    }
  }
}
