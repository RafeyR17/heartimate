import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { isSupabaseServiceRoleConfigured } from '@/lib/runtime-env'
import { serverLog } from '@/lib/server-log'

/**
 * Service role bypasses RLS — treat as root DB access.
 *
 * **Allowed (request path):**
 * - `getOrCreateUser` — first insert before a JWT-backed user row exists
 * - `uploadPreparedAvatar` — `avatars` storage bucket (after route auth)
 * - `try_acquire_chat_rate_slot` — chat rate ledger (`chat_rate_events`)
 * - `try_acquire_api_rate_slot` — write API rate ledger (`api_rate_events`)
 * - Chat idempotency RPCs — `claim_*`, `complete_*`, `fail_*` on `chat_idempotent_requests`
 *
 * **Allowed (offline / cron / tests only):**
 * - `purge_rate_ledgers` (cron), `purge_chat_rate_events`, `purge_api_rate_events`
 * - Seed migrations, integration test setup/teardown
 * - `SUPABASE_RLS_BYPASS=true` dev fallback in `createAuthedDb()` (non-production)
 *
 * **Not allowed:** listing chats, inserting messages, character CRUD, reports insert —
 * use the Clerk JWT client from `createAuthedDb()` (`supabase`) instead.
 */
export type ServiceRoleClient = SupabaseClient

let cached: ServiceRoleClient | null = null

/** Lazy singleton — service role key loaded only when ledger/bootstrap runs. */
export function getServiceRoleClient(): ServiceRoleClient {
  if (!isSupabaseServiceRoleConfigured()) {
    serverLog.error('service-role', 'SUPABASE_SERVICE_ROLE_KEY is not configured')
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured')
  }
  if (!cached) {
    // service role: bootstrap + rate/idempotency ledger RPCs (see module doc)
    cached = createSupabaseAdminClient()
  }
  return cached
}

/** @deprecated Prefer getServiceRoleClient() — documents allowed use. */
export const createServiceRoleClient = getServiceRoleClient
