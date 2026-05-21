import type { SupabaseClient } from '@supabase/supabase-js'
import { daysSinceMs } from '@/lib/date-utils'
import type { ProfileCharacter, ProfileOverviewStats } from '@/lib/profile-types'

export const PROFILE_CHATS_FETCH_LIMIT = 50

const CHARACTER_LIST_COLUMNS =
  'id, name, avatar_url, description, tags, is_nsfw, is_public, likes_count, chat_count, created_at'

export async function fetchProfileCharacters(
  supabase: SupabaseClient,
  userId: string
): Promise<ProfileCharacter[]> {
  const { data } = await supabase
    .from('characters')
    .select(CHARACTER_LIST_COLUMNS)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  return (data ?? []).map((c) => ({
    id: c.id as string,
    name: c.name as string,
    avatar_url: (c.avatar_url as string) || null,
    description: (c.description as string) || null,
    tags: (c.tags as string[]) || [],
    is_nsfw: Boolean(c.is_nsfw),
    is_public: Boolean(c.is_public),
    likes_count: (c.likes_count as number) ?? 0,
    chat_count: (c.chat_count as number) ?? 0,
    created_at: c.created_at as string,
  }))
}

export function computeMostChattedFromChats(
  characters: ProfileCharacter[],
  chatRows: Array<{ character_id: string; total_messages: number | null }>
): ProfileOverviewStats['mostChatted'] {
  if (!chatRows.length) return null

  const charById = new Map(characters.map((c) => [c.id, c]))
  const charTotals = new Map<string, number>()

  for (const row of chatRows) {
    const charId = row.character_id
    const count = Number(row.total_messages ?? 0)
    charTotals.set(charId, (charTotals.get(charId) ?? 0) + count)
  }

  let bestCharId: string | null = null
  let bestCount = 0
  for (const [charId, count] of charTotals) {
    if (count > bestCount) {
      bestCount = count
      bestCharId = charId
    }
  }

  if (!bestCharId || bestCount === 0) {
    const first = characters[0]
    if (!first) return null
    return {
      name: first.name,
      avatar_url: first.avatar_url,
      messageCount: 0,
    }
  }

  const char = charById.get(bestCharId)
  if (!char) return null

  return {
    name: char.name,
    avatar_url: char.avatar_url,
    messageCount: bestCount,
  }
}

export function computeMemberDays(createdAt: string): number {
  return daysSinceMs(createdAt, Date.now())
}
