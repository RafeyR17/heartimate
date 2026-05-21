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

  const user = await getOrCreateUser(clerkId, getServiceRoleClient())
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
