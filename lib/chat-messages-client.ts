import type { MessagesPageResponse as ApiMessagesPageResponse } from '@/lib/api-contract'
import { apiFetch } from '@/lib/api-client'
import type { Message } from '@/lib/chat-ui-types'

export const CHAT_UI_MESSAGE_PAGE_SIZE = 50

export type MessagesPageResponse = {
  messages: Message[]
  hasMore: boolean
  nextCursor: string | null
}

export function parseMessagesFromApi(json: unknown): Message[] {
  return parseMessagesPageResponse(json).messages
}

export function parseMessagesPageResponse(json: unknown): MessagesPageResponse {
  if (Array.isArray(json)) {
    return { messages: json as Message[], hasMore: false, nextCursor: null }
  }
  if (json && typeof json === 'object') {
    const record = json as Record<string, unknown>
    const envelope = record as Partial<ApiMessagesPageResponse>
    const messages = Array.isArray(envelope.messages)
      ? envelope.messages
      : Array.isArray(record.messages)
        ? (record.messages as Message[])
        : []
    return {
      messages,
      hasMore: record.hasMore === true || envelope.hasMore === true,
      nextCursor:
        typeof record.nextCursor === 'string'
          ? record.nextCursor
          : typeof envelope.nextCursor === 'string'
            ? envelope.nextCursor
            : null,
    }
  }
  return { messages: [], hasMore: false, nextCursor: null }
}

export type ChatMessagesQueryData = {
  messages: Message[]
  hasMoreOlder: boolean
  olderCursor: string | null
}

export async function fetchChatMessagesPage(
  chatId: string,
  opts?: { before?: string; limit?: number }
): Promise<ChatMessagesQueryData> {
  const limit = opts?.limit ?? CHAT_UI_MESSAGE_PAGE_SIZE
  const params = new URLSearchParams({ limit: String(limit) })
  if (opts?.before) params.set('before', opts.before)

  const result = await apiFetch(`/api/chats/${chatId}/messages?${params}`)
  if (!result.ok) {
    throw new Error(result.error || 'Failed to load messages')
  }

  const page = parseMessagesPageResponse(result.data)
  return {
    messages: page.messages,
    hasMoreOlder: page.hasMore,
    olderCursor: page.nextCursor,
  }
}
