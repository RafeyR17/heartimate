import { unstable_cache } from 'next/cache'
import { createSupabaseAnonClient } from '@/lib/supabase-server'
import { characterCacheTag, EXPLORE_CACHE_TAG } from '@/lib/cache-tags'

export const CHARACTER_PAGE_REVALIDATE = 300

export type PublicCharacterRecord = {
  id: string
  name: string
  avatar_url: string | null
  description: string | null
  personality: string | null
  scenario: string | null
  greeting: string | null
  example_dialogs: string | null
  tags: string[]
  is_nsfw: boolean
  is_public: boolean
  likes_count: number
  chat_count: number
  created_at: string
  user_id: string
  forked_from_id: string | null
  forked_from_name: string | null
  users: {
    id: string
    display_name: string
    avatar_url: string | null
  } | null
}

export type SuggestedCharacter = {
  id: string
  name: string
  avatar_url: string | null
  tags: string[]
  description: string | null
}

export type PublicCharacterBundle = {
  character: PublicCharacterRecord
  suggested: SuggestedCharacter[]
}

const CHARACTER_SELECT = `
  id,
  name,
  avatar_url,
  description,
  personality,
  scenario,
  greeting,
  example_dialogs,
  tags,
  is_nsfw,
  is_public,
  likes_count,
  chat_count,
  created_at,
  user_id,
  forked_from_id,
  forked_from_name,
  users (
    id,
    display_name,
    avatar_url
  )
`

function normalizeCreator(rawUsers: unknown): PublicCharacterRecord['users'] {
  if (!rawUsers) return null
  const creator = Array.isArray(rawUsers) ? rawUsers[0] : rawUsers
  if (!creator || typeof creator !== 'object') return null
  const row = creator as Record<string, unknown>
  return {
    id: String(row.id),
    display_name: String(row.display_name ?? ''),
    avatar_url: row.avatar_url != null ? String(row.avatar_url) : null,
  }
}

async function fetchPublicCharacterBundle(id: string): Promise<PublicCharacterBundle | null> {
  const supabase = createSupabaseAnonClient()

  const { data: character, error } = await supabase
    .from('characters')
    .select(CHARACTER_SELECT)
    .eq('id', id)
    .eq('is_public', true)
    .single()

  if (error || !character) return null

  const characterTags: string[] = character.tags || []

  let suggestedQuery = supabase
    .from('characters')
    .select('id, name, avatar_url, tags, description, likes_count')
    .eq('is_public', true)
    .neq('id', id)
    .order('likes_count', { ascending: false })
    .limit(4)

  if (characterTags.length > 0) {
    suggestedQuery = suggestedQuery.overlaps('tags', characterTags)
  }

  const { data: suggested } = await suggestedQuery

  const suggestedList = (suggested || []).slice(0, 3).map((item) => ({
    id: item.id as string,
    name: item.name as string,
    avatar_url: (item.avatar_url as string | null) ?? null,
    tags: (item.tags as string[]) || [],
    description: (item.description as string | null) ?? null,
  }))

  return {
    character: {
      ...character,
      tags: characterTags,
      users: normalizeCreator(character.users),
    } as PublicCharacterRecord,
    suggested: suggestedList,
  }
}

export function getCachedPublicCharacterBundle(
  id: string
): Promise<PublicCharacterBundle | null> {
  const cached = unstable_cache(
    () => fetchPublicCharacterBundle(id),
    ['character-public', id],
    {
      revalidate: CHARACTER_PAGE_REVALIDATE,
      tags: [EXPLORE_CACHE_TAG, characterCacheTag(id)],
    }
  )
  return cached()
}
