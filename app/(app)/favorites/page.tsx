import type { Metadata } from 'next'
import { requireAuthedServerDb } from '@/lib/server-auth'
import type { FavoriteCharacter } from '@/lib/favorites-types'
import FavoritesClient from './FavoritesClient'

export const metadata: Metadata = {
  title: 'Favorites',
}

function normalizeFavoriteRow(
  like: { created_at: string; characters: unknown }
): FavoriteCharacter | null {
  const raw = like.characters
  const char = Array.isArray(raw) ? raw[0] : raw
  if (!char || typeof char !== 'object') return null

  const row = char as Record<string, unknown>
  const rawUsers = row.users
  const users = Array.isArray(rawUsers) ? rawUsers[0] : rawUsers
  const creator =
    users && typeof users === 'object'
      ? ((users as { display_name?: string | null }).display_name ?? null)
      : null

  return {
    id: row.id as string,
    name: row.name as string,
    avatar_url: (row.avatar_url as string) || null,
    description: (row.description as string) || null,
    tags: (row.tags as string[]) || [],
    is_nsfw: Boolean(row.is_nsfw),
    likes_count: (row.likes_count as number) ?? 0,
    chat_count: (row.chat_count as number) ?? 0,
    user_id: row.user_id as string,
    creator_display_name: creator,
    liked_at: like.created_at,
  }
}

export default async function FavoritesPage() {
  const { supabase, user } = await requireAuthedServerDb()

  const { data: favorites } = await supabase
    .from('character_likes')
    .select(
      `
      id,
      created_at,
      characters (
        id,
        name,
        avatar_url,
        description,
        tags,
        is_nsfw,
        likes_count,
        chat_count,
        user_id,
        users (
          display_name
        )
      )
    `
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const characters: FavoriteCharacter[] = (favorites ?? [])
    .map((row) =>
      normalizeFavoriteRow({
        created_at: row.created_at as string,
        characters: row.characters,
      })
    )
    .filter((c): c is FavoriteCharacter => c !== null)

  return <FavoritesClient initialCharacters={characters} />
}
