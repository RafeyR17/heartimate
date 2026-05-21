import 'server-only'
import { CLERK_SUPABASE_JWT_TEMPLATE } from '@/lib/supabase-server'

type GetToken = (opts?: { template?: string }) => Promise<string | null>

/**
 * Clerk session token for Supabase RLS.
 * Prefers default session token (native Clerk↔Supabase integration); falls back to JWT template.
 */
export async function resolveClerkSupabaseAccessToken(
  getToken: GetToken
): Promise<string | null> {
  const sessionToken = await getToken()
  if (sessionToken) return sessionToken

  if (CLERK_SUPABASE_JWT_TEMPLATE) {
    return getToken({ template: CLERK_SUPABASE_JWT_TEMPLATE })
  }

  return null
}
