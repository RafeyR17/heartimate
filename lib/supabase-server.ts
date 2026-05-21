import 'server-only'
import { createServerClient } from '@supabase/ssr'
import { createClient, type SupabaseClientOptions } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

/**
 * Serverless: @supabase/supabase-js uses the HTTPS PostgREST API (project URL).
 * Direct Postgres pooler (`*.pooler.supabase.com:6543`) is for SQL drivers only — see docs/INFRA.md.
 */
function supabaseUrl(): string {
  return process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!
}

function serverClientOptions(): SupabaseClientOptions<'public'> {
  return { auth: { autoRefreshToken: false, persistSession: false } }
}

/**
 * Supabase access model (Clerk auth + Supabase data):
 *
 * - createSupabaseAnonClient(): anon key, no user JWT. Public catalog reads only (RLS).
 * - createSupabaseClientWithAccessToken(token): Clerk JWT on anon key; RLS enforces ownership.
 * - getServiceRoleClient() in lib/service-role.ts: service role for bootstrap + ledger RPCs only.
 * - createAuthedDb() in lib/authed-db.ts: RLS client + resolved app user.
 */
export function createSupabaseAnonClient() {
  return createClient(
    supabaseUrl(),
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    serverClientOptions()
  )
}

/** Clerk-issued Supabase JWT (template name default: supabase). Subject to RLS. */
export function createSupabaseClientWithAccessToken(accessToken: string) {
  return createClient(supabaseUrl(), process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    ...serverClientOptions(),
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  })
}

export async function createSupabaseServerClient() {
  const cookieStore = await cookies()
  return createServerClient(
    supabaseUrl(),
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // ignore when called from Server Component
          }
        },
      },
    }
  )
}

/** Low-level service role factory — prefer getServiceRoleClient() from lib/service-role.ts. */
export function createSupabaseAdminClient() {
  return createClient(
    supabaseUrl(),
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    serverClientOptions()
  )
}

export const CLERK_SUPABASE_JWT_TEMPLATE =
  process.env.CLERK_SUPABASE_JWT_TEMPLATE ?? 'supabase'
