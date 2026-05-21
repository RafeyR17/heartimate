import type { SupabaseClient } from '@supabase/supabase-js'
import { parseChatTurnContextRpc } from '@/lib/rpc-parse'

export type ChatTurnCharacter = {
  id: string
  name: string
  personality: string
  scenario: string
  greeting: string
  example_dialogs: string
  tags: string[]
  is_nsfw: boolean
}

export type ChatTurnPersona = {
  id: string
  name: string
  short_bio: string | null
  appearance: string | null
  personality: string | null
}

export type ChatTurnContext = {
  chat: {
    id: string
    user_id: string
    persona_id: string | null
    affection_score: number
    relationship_level: string
    total_messages: number
  }
  character: ChatTurnCharacter
  persona: ChatTurnPersona | null
  messages: Array<{ role: string; content: string }>
  memorySummary: string | null
}

export async function fetchChatTurnContext(
  supabase: SupabaseClient,
  chatId: string,
  userId: string,
  messageLimit = 30
): Promise<ChatTurnContext | null> {
  const { data, error } = await supabase.rpc('get_chat_turn_context', {
    p_chat_id: chatId,
    p_user_id: userId,
    p_message_limit: messageLimit,
  })

  if (error || !data) return null
  return parseChatTurnContextRpc(data)
}
