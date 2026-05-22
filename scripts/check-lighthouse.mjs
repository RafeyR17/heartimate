#!/usr/bin/env node
/**
 * Mobile Lighthouse (LCP, CLS) on production build.
 * Requires: npm run build first (or run via CI job).
 *
 *   npm run build && npm run check:lighthouse
 *
 * Optional: LIGHTHOUSE_URLS=http://127.0.0.1:3000/,http://127.0.0.1:3000/explore
 * Chat (/chat/...) needs auth — add a signed-in URL manually for local runs only.
 *
 * Without Clerk/Supabase env, public routes still render (see lib/runtime-env.ts).
 * CI can pass secrets for full /explore catalog; otherwise explore shows empty state.
 */
import { existsSync, readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { join } from 'node:path'

function loadEnvFile(filename) {
  const path = join(process.cwd(), filename)
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
if (!existsSync(join(root, '.next'))) {
  console.error('Missing .next — run `npm run build` before check:lighthouse')
  process.exit(1)
}

const hasClerk =
  Boolean(process.env.CLERK_SECRET_KEY?.trim()) &&
  Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim())
const hasSupabase =
  Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) &&
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || process.env.SUPABASE_URL?.trim())

if (!hasClerk) {
  console.warn(
    '⚠️  Clerk keys not set — Lighthouse uses public-only middleware (/, /explore shell).'
  )
}
if (!hasSupabase) {
  console.warn('⚠️  Supabase not set — /explore renders without catalog rows.')
}

const result = spawnSync('npx', ['lhci', 'autorun'], {
  stdio: 'inherit',
  env: { ...process.env, CI: 'true' },
  cwd: root,
})

process.exit(result.status ?? 1)
