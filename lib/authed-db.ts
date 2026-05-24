import 'server-only'
import { auth } from '@clerk/nextjs/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getOrCreateUser } from '@/lib/db'
import { resolveClerkSupabaseAccessToken } from '@/lib/clerk-supabase-token'
import { getServiceRoleClient } from '@/lib/service-role'
import {
  CLERK_SUPABASE_JWT_TEMPLATE,
  createSupabaseClientWithAccessToken,
} from '@/lib/supabase-server'
import { isSupabaseServiceRoleConfigured } from '@/lib/runtime-env'
import { serverLog } from '@/lib/server-log'

export type AuthedDbUser = {
  id: string
  display_name: string
  kink_prefs?: string[] | null
  avatar_url?: string | null
}

export type AuthedDb = {
  /** Clerk JWT + anon key — all table access; RLS enforces ownership. */
  supabase: SupabaseClient
  user: AuthedDbUser
  clerkId: string
}

/** @deprecated Use AuthedDb */
export type AuthedAdminDb = AuthedDb



/**
 * Authenticated Supabase client for API routes and RSC pages.
 * Use `supabase` for all CRUD. Rate/idempotency ledgers call `getServiceRoleClient()` internally.
 */
export async function createAuthedDb(): Promise<AuthedDb | null> {
  const { userId: clerkId, getToken } = await auth()
  if (!clerkId) return null

  if (!isSupabaseServiceRoleConfigured()) {
    serverLog.error('authed-db', 'SUPABASE_SERVICE_ROLE_KEY missing — cannot bootstrap user')
    return null
  }

  let user
  try {
    user = await getOrCreateUser(clerkId, getServiceRoleClient())
  } catch (err) {
    serverLog.error('authed-db', 'getOrCreateUser failed', {
      clerkId,
      message: err instanceof Error ? err.message : String(err),
    })
    return null
  }

  if (!user) {
    serverLog.error('authed-db', 'Could not resolve app user', { clerkId })
    return null
  }

  const token = await resolveClerkSupabaseAccessToken((opts) =>
    getToken(opts?.template ? { template: opts.template } : undefined)
  )

  if (!token) {
    serverLog.error('authed-db', 'No Clerk Supabase JWT', {
      template: CLERK_SUPABASE_JWT_TEMPLATE,
    })
    return null
  }

  const supabase = createSupabaseClientWithAccessToken(token)
  return { supabase, user, clerkId }
}

/** @deprecated Use createAuthedDb */
export const createAuthedAdminDb = createAuthedDb
