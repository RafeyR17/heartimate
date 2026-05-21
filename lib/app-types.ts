/** Shared shapes for Supabase nested selects in app routes. */

import type { ChatCharacter } from '@/lib/chat-ui-types'

export type SidebarChatItem = {
  id: string
  character: { name: string; avatar_url: string | null } | null
  persona: { name: string } | { name: string }[] | null
}

export type HomeRecentChat = {
  id: string
  last_message_at: string | null
  character: { name: string; avatar_url: string | null } | null
  persona: { name: string } | { name: string }[] | null
}

export type HomeTrendingCharacter = {
  id: string
  name: string
  avatar_url: string | null
  description: string | null
  tags: string[] | null
  likes_count: number | null
  chat_count: number | null
  is_nsfw: boolean | null
}

export type ChatPageCharacter = {
  id: string
  name: string
  avatar_url: string | null
  description: string | null
  tags: string[] | null
  is_nsfw: boolean
  personality: string | null
  greeting: string | null
}

export type ChatPageRow = {
  id: string
  title: string | null
  affection_score: number | null
  relationship_level: string | null
  characters: ChatPageCharacter | ChatPageCharacter[] | null
  persona: import('@/lib/personas').Persona | import('@/lib/personas').Persona[] | null
}

export function pickPersonaName(
  persona: { name: string } | { name: string }[] | null | undefined
): string | null {
  if (!persona) return null
  if (Array.isArray(persona)) return persona[0]?.name ?? null
  return persona.name
}

export function pickNestedOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

/** Map nested Supabase character row to chat UI defaults. */
export function toChatUiCharacter(c: ChatPageCharacter): ChatCharacter {
  return {
    id: c.id,
    name: c.name,
    avatar_url: c.avatar_url ?? '',
    description: c.description ?? '',
    tags: c.tags ?? [],
    is_nsfw: c.is_nsfw,
    personality: c.personality ?? '',
    greeting: c.greeting ?? '',
  }
}
