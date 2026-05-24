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

function normalizeTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return []
  return tags.filter((t): t is string => typeof t === 'string')
}

function parseHomeTrending(raw: unknown): HomeTrendingCharacter[] {
  if (!Array.isArray(raw)) return []
  return raw.map((row) => {
    const r = row as Record<string, unknown>
    return {
      id: String(r.id ?? ''),
      name: String(r.name ?? ''),
      avatar_url: (r.avatar_url as string | null) ?? null,
      description: (r.description as string | null) ?? null,
      tags: normalizeTags(r.tags),
      likes_count: typeof r.likes_count === 'number' ? r.likes_count : null,
      chat_count: typeof r.chat_count === 'number' ? r.chat_count : null,
      is_nsfw: Boolean(r.is_nsfw),
    }
  })
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
