import { auth } from '@clerk/nextjs/server'
import { createAuthedDb } from '@/lib/authed-db'
import { createSupabaseAnonClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import CharacterDetailShell from './CharacterDetailShell'
import { CharacterDetailHero } from './character-detail/CharacterDetailHero'
import { characterReadableByUser } from '@/lib/character-access'
import {
  getCachedPublicCharacterBundle,
  type PublicCharacterRecord,
  type SuggestedCharacter,
} from '@/lib/character-public-data'
import { storyDaysSince } from '@/lib/date-utils'
import type { SupabaseClient } from '@supabase/supabase-js'

export const revalidate = 300

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

function normalizeCreator(rawUsers: unknown) {
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

async function fetchCharacterLive(
  supabase: SupabaseClient,
  id: string
): Promise<{
  character: PublicCharacterRecord
  suggested: SuggestedCharacter[]
} | null> {
  const { data: character } = await supabase
    .from('characters')
    .select(CHARACTER_SELECT)
    .eq('id', id)
    .single()

  if (!character) return null

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

export default async function CharacterPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { userId: clerkId } = await auth()

  let user: { id: string; avatar_url?: string | null } | null = null
  let supabase: SupabaseClient = createSupabaseAnonClient()

  if (clerkId) {
    const authed = await createAuthedDb()
    if (!authed) redirect('/login')
    user = authed.user
    supabase = authed.supabase
  }

  let character: PublicCharacterRecord | null = null
  let suggested: SuggestedCharacter[] = []

  if (!user) {
    const bundle = await getCachedPublicCharacterBundle(id)
    if (!bundle) redirect('/explore')
    character = bundle.character
    suggested = bundle.suggested
  } else {
    const live = await fetchCharacterLive(supabase, id)
    if (!live) redirect('/explore')

    const readable = characterReadableByUser(live.character, user.id)
    if (!readable) redirect('/explore')

    const ownerPrivatePreview =
      live.character.is_public !== true && live.character.user_id === user.id

    if (ownerPrivatePreview) {
      character = live.character
      suggested = live.suggested
    } else if (live.character.is_public === true) {
      const bundle = await getCachedPublicCharacterBundle(id)
      if (bundle) {
        character = bundle.character
        suggested = bundle.suggested
      } else {
        character = live.character
        suggested = live.suggested
      }
    } else {
      character = live.character
      suggested = live.suggested
    }
  }

  if (!character) redirect('/explore')

  let isLiked = false
  if (user) {
    const { data: likeData } = await supabase
      .from('character_likes')
      .select('id')
      .eq('user_id', user.id)
      .eq('character_id', id)
      .maybeSingle()
    isLiked = !!likeData
  }

  const characterTags: string[] = character.tags || []

  let story: {
    chatId: string
    affectionScore: number
    relationshipLevel: string
    totalMessages: number
    startedAt: string
    lastOpenedAt: string
  } | null = null

  let existingChat: {
    id: string
    affection_score: number | null
    relationship_level: string | null
    total_messages: number | null
    created_at: string
    last_opened_at: string | null
  } | null = null

  if (user) {
    const { data } = await supabase
      .from('chats')
      .select('id, affection_score, relationship_level, total_messages, created_at, last_opened_at')
      .eq('user_id', user.id)
      .eq('character_id', id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    existingChat = data
  }

  if (existingChat) {
    story = {
      chatId: existingChat.id,
      affectionScore: Number(existingChat.affection_score ?? 0),
      relationshipLevel: String(existingChat.relationship_level ?? 'stranger'),
      totalMessages: Number(existingChat.total_messages ?? 0),
      startedAt: String(existingChat.created_at),
      lastOpenedAt: String(existingChat.last_opened_at ?? existingChat.created_at),
    }
  }

  const creator = character.users

  return (
    <div className="min-h-[100dvh] bg-[#080608]">
      <CharacterDetailHero
        name={character.name}
        avatarUrl={character.avatar_url}
        tags={characterTags}
        isNsfw={character.is_nsfw}
        forkedFrom={
          character.forked_from_id && character.forked_from_name
            ? { id: character.forked_from_id, name: character.forked_from_name }
            : null
        }
      />
      <CharacterDetailShell
        character={{
          ...character,
          tags: characterTags,
        }}
        creator={creator}
        currentUserId={user?.id ?? null}
        currentUserAvatarUrl={user?.avatar_url ?? null}
        isLiked={isLiked}
        suggested={suggested}
        story={story}
        storyDays={story ? storyDaysSince(story.startedAt) : 0}
      />
    </div>
  )
}
