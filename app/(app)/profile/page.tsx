import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { requireAuthedServerDb } from '@/lib/server-auth'
import ProfileClient from './ProfileClientDynamic'
import type {
  ProfileCharacter,
  ProfileChat,
  ProfileCounts,
  ProfileFavorite,
  ProfileOverviewStats,
  ProfilePersona,
  ProfileUser,
} from '@/lib/profile-types'
import {
  PROFILE_CHATS_FETCH_LIMIT,
  computeMemberDays,
  computeMostChattedFromChats,
  fetchProfileCharacters,
} from '@/lib/profile-queries'



function normalizeCharacter(raw: Record<string, unknown>): ProfileCharacter {
  return {
    id: raw.id as string,
    name: raw.name as string,
    avatar_url: (raw.avatar_url as string) || null,
    description: (raw.description as string) || null,
    tags: (raw.tags as string[]) || [],
    is_nsfw: Boolean(raw.is_nsfw),
    is_public: Boolean(raw.is_public),
    likes_count: (raw.likes_count as number) ?? 0,
    chat_count: (raw.chat_count as number) ?? 0,
    created_at: raw.created_at as string,
  }
}

function computeTopTag(characters: ProfileCharacter[]): string | null {
  const counts = new Map<string, number>()
  for (const char of characters) {
    for (const tag of char.tags ?? []) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1)
    }
  }
  let top: string | null = null
  let max = 0
  for (const [tag, count] of counts) {
    if (count > max) {
      max = count
      top = tag
    }
  }
  return top
}

export default async function ProfilePage() {
  const { userId: clerkId } = await auth()
  if (!clerkId) redirect('/login')

  const { supabase, user: dbUser } = await requireAuthedServerDb()

  const clerkUser = await currentUser()
  const clerkImageUrl = clerkUser?.imageUrl ?? null

  const { data: userRow, error: userError } = await supabase
    .from('users')
    .select('id, display_name, bio, avatar_url, is_premium, created_at')
    .eq('id', dbUser.id)
    .single()

  if (userError || !userRow) redirect('/onboarding')

  const user: ProfileUser = {
    id: userRow.id,
    display_name: userRow.display_name ?? 'User',
    bio: userRow.bio ?? null,
    avatar_url: userRow.avatar_url ?? null,
    is_premium: Boolean(userRow.is_premium),
    created_at: userRow.created_at ?? new Date().toISOString(),
  }

  const [
    characters,
    { data: chatsRaw, count: chatsTotal },
    { data: likesRaw },
    { data: personasRaw },
    { data: chatStatsRaw },
  ] = await Promise.all([
    fetchProfileCharacters(supabase, user.id),
    supabase
      .from('chats')
      .select(
        `
        id,
        last_message_at,
        last_message_preview,
        last_message_role,
        character:characters (
          id,
          name,
          avatar_url
        )
      `,
        { count: 'exact' }
      )
      .eq('user_id', user.id)
      .order('last_message_at', { ascending: false })
      .limit(PROFILE_CHATS_FETCH_LIMIT),
    supabase
      .from('character_likes')
      .select(
        `
        id,
        characters (
          id,
          name,
          avatar_url,
          description,
          tags,
          is_nsfw,
          is_public,
          likes_count,
          chat_count,
          created_at
        )
      `
      )
      .eq('user_id', user.id),
    supabase
      .from('personas')
      .select('id, name, avatar_url, short_bio, appearance, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('chats')
      .select('character_id, total_messages')
      .eq('user_id', user.id),
  ])

  const chats: ProfileChat[] = (chatsRaw ?? []).map((chat) => {
    const rawChar = chat.character
    const character = Array.isArray(rawChar) ? rawChar[0] : rawChar
    const preview = chat.last_message_preview as string | null
    const role = chat.last_message_role as string | null
    const lastMessageAt = (chat.last_message_at as string) ?? null

    return {
      id: chat.id as string,
      last_message_at: lastMessageAt,
      character: character
        ? {
            id: character.id as string,
            name: character.name as string,
            avatar_url: (character.avatar_url as string) || null,
          }
        : null,
      lastMessage:
        preview && role && lastMessageAt
          ? {
              role,
              content: preview,
              created_at: lastMessageAt,
            }
          : null,
    }
  })

  const favorites: ProfileFavorite[] = (likesRaw ?? [])
    .map((row) => {
      const raw = row.characters
      const char = Array.isArray(raw) ? raw[0] : raw
      if (!char) return null
      return {
        likeId: row.id as string,
        character: normalizeCharacter(char as Record<string, unknown>),
      }
    })
    .filter((f): f is ProfileFavorite => f !== null)

  const personas: ProfilePersona[] = (personasRaw ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    avatar_url: p.avatar_url,
    short_bio: p.short_bio,
    appearance: p.appearance,
    created_at: p.created_at,
  }))

  const counts: ProfileCounts = {
    characters: characters.length,
    chats: chatsTotal ?? chats.length,
    favorites: favorites.length,
    personas: personas.length,
  }

  const memberDays = computeMemberDays(user.created_at)

  const mostChatted = computeMostChattedFromChats(
    characters,
    (chatStatsRaw ?? []) as Array<{ character_id: string; total_messages: number | null }>
  )

  const overviewStats: ProfileOverviewStats = {
    mostChatted,
    newestCharacter: characters[0] ?? null,
    topTag: computeTopTag(characters),
    memberDays,
  }

  return (
    <Suspense fallback={<div className="min-h-[40vh] bg-[#080608] animate-pulse" />}>
      <ProfileClient
        user={user}
        clerkImageUrl={clerkImageUrl}
        characters={characters}
        chats={chats}
        favorites={favorites}
        personas={personas}
        counts={counts}
        overviewStats={overviewStats}
      />
    </Suspense>
  )
}
