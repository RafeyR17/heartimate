import type { SupabaseClient } from '@supabase/supabase-js'
import {
  pickNestedOne,
  toChatUiCharacter,
  type ChatPageRow,
} from '@/lib/app-types'
import { fetchChatMessagesPage } from '@/lib/chat-messages'
import type { Persona } from '@/lib/persona-constants'
import type { ChatCharacter } from '@/lib/chat-ui-types'

const CHAT_PAGE_SELECT = `
  id,
  title,
  persona_id,
  affection_score,
  relationship_level,
  total_messages,
  characters (
    id,
    name,
    avatar_url,
    description,
    tags,
    is_nsfw,
    personality,
    greeting
  ),
  persona:personas (
    id,
    name,
    avatar_url,
    short_bio,
    appearance,
    personality
  )
` as const

export type ChatPageBundle = {
  character: ChatCharacter
  persona: Persona | null
  initialTitle: string | null
  initialAffectionScore: number
  initialRelationshipLevel: string
  initialMessages: Awaited<ReturnType<typeof fetchChatMessagesPage>>['messages']
  initialHasMore: boolean
  initialOlderCursor: string | null
}

function parseChatPageRow(raw: unknown): ChatPageRow | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as ChatPageRow
  if (!row.characters) return null
  return row
}

export async function fetchChatPageBundle(
  supabase: SupabaseClient,
  chatId: string,
  userId: string
): Promise<ChatPageBundle | null> {
  const { data } = await supabase
    .from('chats')
    .select(CHAT_PAGE_SELECT)
    .eq('id', chatId)
    .eq('user_id', userId)
    .single()

  const chatRow = parseChatPageRow(data)
  if (!chatRow) return null

  const characterRaw = pickNestedOne(chatRow.characters)
  if (!characterRaw) return null

  let persona = (pickNestedOne(chatRow.persona) as Persona | null) ?? null
  const personaId = chatRow.persona_id ?? null
  if (!persona && personaId) {
    const { data: personaRow } = await supabase
      .from('personas')
      .select('id, user_id, name, avatar_url, short_bio, appearance, personality, created_at, updated_at')
      .eq('id', personaId)
      .eq('user_id', userId)
      .maybeSingle()
    persona = (personaRow as Persona | null) ?? null
  }
  const initialPage = await fetchChatMessagesPage(supabase, chatId, { limit: 50 })

  return {
    character: toChatUiCharacter(characterRaw),
    persona,
    initialTitle: chatRow.title ?? null,
    initialAffectionScore: Number(chatRow.affection_score ?? 0),
    initialRelationshipLevel: String(chatRow.relationship_level ?? 'stranger'),
    initialMessages: initialPage.messages,
    initialHasMore: initialPage.hasMore,
    initialOlderCursor: initialPage.nextCursor,
  }
}
