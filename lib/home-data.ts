import type { SupabaseClient } from '@supabase/supabase-js'
import type { HomeRecentChat, HomeTrendingCharacter } from '@/lib/app-types'

const HOME_RECENT_SELECT = `
  *,
  character:characters (
    name,
    avatar_url
  ),
  persona:personas (
    name
  )
` as const

function parseHomeRecentChats(raw: unknown): HomeRecentChat[] {
  return Array.isArray(raw) ? (raw as HomeRecentChat[]) : []
}

function parseHomeTrending(raw: unknown): HomeTrendingCharacter[] {
  return Array.isArray(raw) ? (raw as HomeTrendingCharacter[]) : []
}

export async function fetchHomeRecentChats(
  supabase: SupabaseClient,
  userId: string,
  limit = 3
): Promise<HomeRecentChat[]> {
  const { data } = await supabase
    .from('chats')
    .select(HOME_RECENT_SELECT)
    .eq('user_id', userId)
    .order('last_message_at', { ascending: false })
    .limit(limit)

  return parseHomeRecentChats(data)
}

export async function fetchHomeTrendingCharacters(
  supabase: SupabaseClient,
  limit = 8
): Promise<HomeTrendingCharacter[]> {
  const { data } = await supabase
    .from('characters')
    .select('id, name, avatar_url, description, tags, likes_count, chat_count, is_nsfw')
    .eq('is_public', true)
    .order('likes_count', { ascending: false })
    .limit(limit)

  return parseHomeTrending(data)
}
