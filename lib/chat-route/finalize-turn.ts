import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import { getRelationshipLevel } from '@/lib/affection'
import { failChatIdempotency } from '@/lib/chat-idempotency'
import { getApiContext } from '@/lib/observability/request-context'
import { getPostHogClient } from '@/lib/posthog-server'
import { ASSISTANT_EMPTY_FALLBACK, MEMORY_REFRESH_INTERVAL } from '@/lib/chat-route/constants'
import { updateMemory } from '@/lib/chat-route/memory'

export type ChatRouteCharacter = {
  id: string
  name: string
  personality: string
  scenario: string
  greeting: string
  example_dialogs: string
  tags: string[]
  is_nsfw: boolean
}

export type FinalizeTurnParams = {
  chatId: string
  supabase: SupabaseClient
  clerkId: string
  character: ChatRouteCharacter
  assistantContent: string
  baseTotalMessages: number
  messageDelta: number
  projectedAfterUser: number
  projectedAfterAssistant: number
  prevRelationship: ReturnType<typeof getRelationshipLevel>
  levelUp: boolean
  messageHistory: Array<{ role: 'user' | 'assistant'; content: string }>
  userMessageId: string | null
  userId: string
  idempotencyKey: string | null
}

function shouldRefreshMemory(newTotalMessages: number): boolean {
  return newTotalMessages > 0 && newTotalMessages % MEMORY_REFRESH_INTERVAL === 0
}

export async function rollbackUserMessage(
  supabase: SupabaseClient,
  userMessageId: string | null
): Promise<void> {
  if (!userMessageId) return
  const { error } = await supabase.from('messages').delete().eq('id', userMessageId)
  if (error) {
    getApiContext()?.log.error('persist.user_rollback_failed', {
      userMessageId,
      error: error.message,
    })
  }
}

export async function finalizeAssistantTurn(params: FinalizeTurnParams): Promise<boolean> {
  const {
    chatId,
    supabase,
    clerkId,
    character,
    assistantContent,
    baseTotalMessages,
    messageDelta,
    projectedAfterUser,
    projectedAfterAssistant,
    prevRelationship,
    levelUp,
    messageHistory,
    userMessageId,
    userId,
  } = params

  const raw = assistantContent.trim()
  const isEmptyFailure = !raw
  const content = isEmptyFailure ? ASSISTANT_EMPTY_FALLBACK : raw

  const newTotalMessages = baseTotalMessages + messageDelta
  const affectionScore = isEmptyFailure ? projectedAfterUser : projectedAfterAssistant
  const relationship = getRelationshipLevel(affectionScore)

  const { error: finalizeError } = await supabase.rpc('finalize_chat_turn', {
    p_chat_id: chatId,
    p_user_id: userId,
    p_assistant_content: content,
    p_new_total_messages: newTotalMessages,
    p_affection_score: affectionScore,
    p_relationship_level: relationship.level,
  })

  if (finalizeError) {
    getApiContext()?.log.error('finalize_turn.failed', {
      chatId,
      error: finalizeError.message,
    })
    await rollbackUserMessage(supabase, userMessageId)
    if (params.idempotencyKey) {
      await failChatIdempotency(params.userId, params.idempotencyKey)
    }
    return false
  }

  if (shouldRefreshMemory(newTotalMessages)) {
    const memoryLog = getApiContext()?.log
    if (!memoryLog) return true
    void memoryLog.span?.('memory.refresh', () =>
      updateMemory(chatId, supabase, messageHistory, content, memoryLog)
    )
  }

  const posthog = getPostHogClient()
  posthog.capture({
    distinctId: clerkId,
    event: 'chat_message_sent',
    properties: {
      chat_id: chatId,
      character_id: character.id,
      character_name: character.name,
      affection_score: affectionScore,
      relationship_level: relationship.level,
      total_messages: newTotalMessages,
      assistant_empty: isEmptyFailure,
    },
  })

  if (levelUp && !isEmptyFailure) {
    posthog.capture({
      distinctId: clerkId,
      event: 'relationship_level_up',
      properties: {
        chat_id: chatId,
        character_id: character.id,
        character_name: character.name,
        previous_level: prevRelationship.level,
        new_level: relationship.level,
        new_label: relationship.label,
        affection_score: affectionScore,
      },
    })
  }

  return true
}
