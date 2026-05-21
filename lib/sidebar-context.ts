import type { SupabaseClient } from '@supabase/supabase-js'
import type { SidebarChatItem } from '@/lib/app-types'
import { parseSidebarContextRpc } from '@/lib/rpc-parse'
import { serverLog } from '@/lib/server-log'

export type SidebarContext = {
  displayName: string
  avatarUrl: string | null
  streakCount: number
  chats: SidebarChatItem[]
}

export async function fetchSidebarContext(
  supabase: SupabaseClient,
  userId: string
): Promise<SidebarContext | null> {
  const { data, error } = await supabase.rpc('get_sidebar_context', {
    p_user_id: userId,
  })

  if (error || !data) {
    serverLog.error('fetchSidebarContext', error?.message ?? 'invalid response')
    return null
  }

  const parsed = parseSidebarContextRpc(data)
  if (!parsed) {
    serverLog.error('fetchSidebarContext', 'rpc returned ok=false or invalid shape')
    return null
  }

  return parsed
}
