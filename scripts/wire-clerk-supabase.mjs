#!/usr/bin/env node
/**
 * One-time Clerk + Supabase wiring helper.
 * - Ensures Clerk JWT template `supabase` exists
 * - Registers Supabase third-party auth when SUPABASE_ACCESS_TOKEN is set
 * - Prints dashboard URLs for manual steps
 */
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

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

const CLERK_SECRET = process.env.CLERK_SECRET_KEY
const SUPABASE_ACCESS = process.env.SUPABASE_ACCESS_TOKEN
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const PROJECT_REF =
  process.env.SUPABASE_PROJECT_REF ??
  SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] ??
  ''

function clerkDomainFromPublishableKey() {
  const pk = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  if (!pk) return null
  const b64 = pk.replace(/^pk_test_/, '').replace(/^pk_live_/, '').replace(/\$$/, '')
  try {
    const decoded = Buffer.from(b64, 'base64').toString('utf8')
    if (decoded.includes('clerk')) return decoded.replace(/\$$/, '')
  } catch {
    /* ignore */
  }
  return null
}

const CLERK_DOMAIN =
  process.env.CLERK_DOMAIN ?? clerkDomainFromPublishableKey() ?? 'YOUR_INSTANCE.clerk.accounts.dev'

async function clerkFetch(path, init = {}) {
  if (!CLERK_SECRET) throw new Error('Missing CLERK_SECRET_KEY')
  const res = await fetch(`https://api.clerk.com/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${CLERK_SECRET}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  })
  const text = await res.text()
  let json = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = text
  }
  if (!res.ok) {
    throw new Error(`Clerk API ${path} ${res.status}: ${text}`)
  }
  return json
}

async function ensureClerkJwtTemplate() {
  const templates = await clerkFetch('/jwt_templates')
  if (templates.some((t) => t.name === 'supabase')) {
    console.log('✓ Clerk JWT template "supabase" already exists')
    return
  }
  await clerkFetch('/jwt_templates', {
    method: 'POST',
    body: JSON.stringify({
      name: 'supabase',
      claims: { aud: 'authenticated', role: 'authenticated' },
    }),
  })
  console.log('✓ Created Clerk JWT template "supabase"')
}

async function registerSupabaseThirdPartyAuth() {
  if (!SUPABASE_ACCESS || !PROJECT_REF) return false

  const issuer = `https://${CLERK_DOMAIN}`
  const listRes = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth/third-party-auth`,
    { headers: { Authorization: `Bearer ${SUPABASE_ACCESS}` } }
  )
  if (!listRes.ok) {
    console.warn('⚠ Could not list Supabase TPA:', await listRes.text())
    return false
  }
  const existing = await listRes.json()
  if (existing.some((e) => e.oidc_issuer_url?.includes(CLERK_DOMAIN))) {
    console.log('✓ Supabase third-party auth for Clerk already registered')
    return true
  }

  const createRes = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth/third-party-auth`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SUPABASE_ACCESS}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ oidc_issuer_url: issuer }),
    }
  )
  if (!createRes.ok) {
    console.warn('⚠ Supabase TPA create failed:', await createRes.text())
    return false
  }
  console.log('✓ Registered Supabase third-party auth for', issuer)
  return true
}

function printManualSteps() {
  console.log('\n--- Manual steps (required if Supabase TPA not auto-registered) ---\n')
  console.log('1. Clerk native integration (recommended):')
  console.log('   https://dashboard.clerk.com/setup/supabase\n')
  console.log('2. Supabase → Authentication → Third-Party Auth → Add Clerk')
  if (PROJECT_REF) {
    console.log(
      `   https://supabase.com/dashboard/project/${PROJECT_REF}/auth/third-party`
    )
  }
  console.log(`   Domain: ${CLERK_DOMAIN}\n`)
  console.log('3. Apply migrations: supabase db push  (or SQL editor, through 20240533_*)\n')
  console.log('4. Vercel: SUPABASE_RLS_BYPASS unset; service role server-only\n')
  console.log('5. Verify: npm run auth:verify\n')
}

async function main() {
  console.log('Heartimate — Clerk + Supabase wiring\n')
  if (!CLERK_SECRET) {
    console.error('✗ Missing CLERK_SECRET_KEY in .env.local')
    process.exit(1)
  }
  if (!SUPABASE_URL) {
    console.error('✗ Missing NEXT_PUBLIC_SUPABASE_URL')
    process.exit(1)
  }

  await ensureClerkJwtTemplate()
  if (!SUPABASE_ACCESS) {
    console.log('\nℹ SUPABASE_ACCESS_TOKEN not set — cannot auto-register Supabase TPA via API.')
    console.log('  Get one: https://supabase.com/dashboard/account/tokens')
    console.log('  Then: SUPABASE_ACCESS_TOKEN=sbp_... npm run auth:wire\n')
  }
  const tpaOk = await registerSupabaseThirdPartyAuth()
  if (!tpaOk) printManualSteps()
  else console.log('\nRun: npm run auth:verify')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
