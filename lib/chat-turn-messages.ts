export type ChatHistoryMessage = { role: 'user' | 'assistant'; content: string }

export type BuildMessageHistoryResult =
  | { ok: true; history: ChatHistoryMessage[] }
  | { ok: false; error: 'last_not_user' }

/**
 * Builds OpenRouter message history for a chat turn.
 * Regenerate/edit-resend (omitUserPersist) replaces the last user row — no DB duplicate.
 */
export function buildMessageHistoryForChatTurn(params: {
  contextMessages: Array<{ role: string; content: string }>
  messageContent: string
  omitUserPersist: boolean
  sanitize?: (text: string) => string
}): BuildMessageHistoryResult {
  const sanitize = params.sanitize ?? ((t) => t)
  const messageHistory: ChatHistoryMessage[] = params.contextMessages.map((m) => ({
    role: m.role as 'user' | 'assistant',
    content: sanitize(String(m.content ?? '')),
  }))

  if (params.omitUserPersist) {
    const last = messageHistory[messageHistory.length - 1]
    if (!last || last.role !== 'user') {
      return { ok: false, error: 'last_not_user' }
    }
    messageHistory[messageHistory.length - 1] = {
      role: 'user',
      content: sanitize(params.messageContent),
    }
    return { ok: true, history: messageHistory }
  }

  messageHistory.push({
    role: 'user',
    content: sanitize(params.messageContent),
  })
  return { ok: true, history: messageHistory }
}
