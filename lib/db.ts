import type { ServiceRoleClient } from '@/lib/service-role'
import { getServiceRoleClient } from '@/lib/service-role'
import { serverLog } from '@/lib/server-log'

export async function getOrCreateUser(clerkId: string, db?: ServiceRoleClient) {
  // service role: bootstrap user row before Clerk JWT + RLS client is available
  const supabase = db ?? getServiceRoleClient()

  const { data: existing } = await supabase
    .from('users')
    .select('id, display_name, kink_prefs, avatar_url')
    .eq('clerk_id', clerkId)
    .maybeSingle()

  if (existing) return existing

  const { data: created, error: insertError } = await supabase
    .from('users')
    .insert({
      clerk_id: clerkId,
      display_name: 'User',
      kink_prefs: [],
    })
    .select('id, display_name, kink_prefs, avatar_url')
    .single()

  if (created) return created

  if (insertError) {
    serverLog.error('getOrCreateUser', 'insert error', insertError)
    const { data: retry } = await supabase
      .from('users')
      .select('id, display_name, kink_prefs, avatar_url')
      .eq('clerk_id', clerkId)
      .maybeSingle()
    return retry
  }

  return null
}
