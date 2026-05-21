#!/usr/bin/env node
/**
 * Pre-deploy perf checklist (env + migration hints).
 * Run: node scripts/check-perf.mjs
 */
import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

function loadEnvFile(filename) {
  const path = resolve(process.cwd(), filename)
  if (!existsSync(path)) return
  for (const line of readFileSync(path, 'utf8').split('\n')) {
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

const root = process.cwd()
const migrations = join(root, 'supabase/migrations')
const requiredMigrations = [
  '20240601_chat_last_message_preview.sql',
  '20240602_purge_rate_ledgers.sql',
  '20240603_perf_rpc_hot_paths.sql',
]

const warnings = []
const errors = []

if (process.env.NODE_ENV === 'production' && !process.env.CRON_SECRET) {
  errors.push('CRON_SECRET is required in production (Vercel cron purge)')
}

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  warnings.push('NEXT_PUBLIC_SUPABASE_URL not set (ok for local lint)')
}

for (const file of requiredMigrations) {
  if (!existsSync(join(migrations, file))) {
    errors.push(`Missing migration: supabase/migrations/${file}`)
  }
}

console.log('Heartimate perf checklist')
if (errors.length) {
  console.error('\nErrors:')
  for (const e of errors) console.error(`  ✗ ${e}`)
}
if (warnings.length) {
  console.warn('\nWarnings:')
  for (const w of warnings) console.warn(`  ! ${w}`)
}
if (!errors.length && !warnings.length) {
  console.log('\n✓ Env and migration files look good')
  console.log('  Next: apply migrations, set CRON_SECRET on Vercel, align regions (docs/INFRA.md)')
  console.log('  Measure: npm run analyze (Turbopack UI at http://localhost:4000)')
  console.log('  Legacy HTML report: npm run analyze:webpack → .next/analyze/client.html')
}

process.exit(errors.length ? 1 : 0)
