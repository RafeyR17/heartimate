#!/usr/bin/env node
/**
 * Verify Clerk JWT is accepted by Supabase and RLS blocks cross-user reads.
 * Exit 0 = ready for staging; exit 1 = fix steps printed.
 */
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

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

const errors = []
const ok = []

function requireEnv(name) {
  const v = process.env[name]
  if (!v) errors.push(`Missing ${name}`)
  return v ?? ''
}

async function main() {
  console.log('Heartimate — auth setup verification\n')

  if (process.env.NODE_ENV === 'production' && process.env.SUPABASE_RLS_BYPASS === 'true') {
    errors.push('SUPABASE_RLS_BYPASS must not be true in production')
  } else {
    ok.push('SUPABASE_RLS_BYPASS not enabled for production')
  }

  const url = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
  const anon = requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  const serviceKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY')
  const clerkSecret = requireEnv('CLERK_SECRET_KEY')

  if (errors.length) {
    const missingEnv = errors.some((e) => e.startsWith('Missing '))
    if (missingEnv) {
      const hasLocal = existsSync(resolve(process.cwd(), '.env.local'))
      const hasEnv = existsSync(resolve(process.cwd(), '.env'))
      if (!hasLocal && !hasEnv) {
        console.error(
          '✗ No .env.local (or .env) in repo root — npm run auth:verify needs local secrets.\n' +
            '  Copy from Vercel: Project → Settings → Environment Variables,\n' +
            '  or run: vercel env pull .env.local\n'
        )
      } else if (!hasLocal) {
        console.error(
          '✗ Keys not found after loading .env — add them to .env.local (gitignored).\n'
        )
      }
    }
    errors.forEach((e) => console.error('✗', e))
    process.exit(1)
  }

  const admin = createClient(url, serviceKey)
  const { error: usersErr } = await admin.from('users').select('id').limit(1)
  if (usersErr) errors.push(`Supabase admin connect failed: ${usersErr.message}`)
  else ok.push('Supabase service role connects')

  const { data: fnCheck, error: fnErr } = await admin.rpc('clerk_sub')
  if (fnErr?.message?.includes('does not exist')) {
    errors.push('Migration 20240531 missing (clerk_sub RPC not found)')
  } else if (fnErr) {
    errors.push(`clerk_sub RPC error: ${fnErr.message}`)
  } else {
    ok.push('clerk_sub() RPC exists')
    if (fnCheck !== null) ok.push('clerk_sub() callable (null without JWT is expected)')
  }

  const { error: deleteRpcErr } = await admin.rpc('delete_owned_message', {
    p_message_id: 'probe-nonexistent',
    p_user_id: 'probe-nonexistent',
  })
  if (deleteRpcErr?.code === 'PGRST202') {
    errors.push(
      'Migration 20240533 missing (delete_owned_message RPC) — apply supabase/migrations/20240533_message_ops_atomic.sql'
    )
  } else if (deleteRpcErr && !deleteRpcErr.message?.includes('not_found')) {
    // Any non-missing RPC response means the function exists
    ok.push('delete_owned_message RPC exists')
  } else {
    ok.push('delete_owned_message RPC exists')
  }

  const { createClerkClient } = await import('@clerk/backend')
  const clerk = createClerkClient({ secretKey: clerkSecret })

  const emailA = 'hm-verify-a+test@example.com'
  const emailB = 'hm-verify-b+test@example.com'

  async function ensureClerkUser(email) {
    const list = await clerk.users.getUserList({ emailAddress: [email], limit: 1 })
    if (list.data[0]) return list.data[0].id
    const u = await clerk.users.createUser({
      emailAddress: [email],
      password: 'HmVerify123!@#',
      skipPasswordChecks: true,
    })
    return u.id
  }

  const clerkA = await ensureClerkUser(emailA)
  const clerkB = await ensureClerkUser(emailB)

  const sess = await clerk.sessions.createSession({ userId: clerkA })
  let jwt = null
  try {
    const sessionTok = await clerk.sessions.getToken(sess.id)
    jwt = sessionTok.jwt
  } catch {
    try {
      const tpl = await clerk.sessions.getToken(sess.id, 'supabase')
      jwt = tpl.jwt
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      errors.push(`Could not mint Clerk JWT: ${msg}`)
    }
  }

  if (jwt) {
    const rlsClient = createClient(url, anon, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    })
    const { error: jwtErr } = await rlsClient.from('users').select('id').limit(1)
    if (jwtErr?.code === 'PGRST301') {
      errors.push(
        'Supabase rejects Clerk JWT (PGRST301) — enable Clerk third-party auth: npm run auth:wire'
      )
    } else if (jwtErr) {
      errors.push(`RLS client query failed: ${jwtErr.message}`)
    } else {
      ok.push('Supabase accepts Clerk JWT')

      const appUserB =
        (
          await admin.from('users').select('id').eq('clerk_id', clerkB).maybeSingle()
        ).data?.id ?? `hm-verify-b-${Date.now()}`
      if (!(await admin.from('users').select('id').eq('clerk_id', clerkB).maybeSingle()).data) {
        await admin.from('users').insert({
          id: appUserB,
          clerk_id: clerkB,
          display_name: 'Verify B',
        })
      }

      const { data: seedChar } = await admin
        .from('characters')
        .select('id, greeting')
        .eq('is_public', true)
        .limit(1)
        .maybeSingle()

      if (seedChar) {
        const { data: chatRow } = await admin.rpc('create_chat_with_greeting', {
          p_user_id: appUserB,
          p_character_id: seedChar.id,
          p_persona_id: null,
          p_title: 'Verify B chat',
          p_greeting: seedChar.greeting ?? 'hi',
        })
        const chatIdB = chatRow?.chat_id
        if (chatIdB) {
          const { data: leak } = await rlsClient
            .from('chats')
            .select('id')
            .eq('id', chatIdB)
            .maybeSingle()
          if (leak) {
            errors.push('IDOR: user A can read user B chat — RLS misconfigured')
          } else {
            ok.push('RLS blocks cross-user chat read (IDOR)')
          }
          await admin.from('messages').delete().eq('chat_id', chatIdB)
          await admin.from('chats').delete().eq('id', chatIdB)
        }
      }
    }
  }

  await clerk.sessions.revokeSession(sess.id)

  console.log('')
  ok.forEach((m) => console.log('✓', m))
  if (errors.length) {
    console.log('')
    errors.forEach((e) => console.error('✗', e))
    console.log('\nRun: npm run auth:wire')
    process.exit(1)
  }
  console.log('\nAuth setup OK — run: npm run auth:prove-idor')
  console.log('Then proceed with staging smoke test (docs/CLERK_SUPABASE_SETUP.md §5).')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
