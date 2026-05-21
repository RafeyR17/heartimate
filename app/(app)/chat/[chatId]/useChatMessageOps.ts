'use client'

import { useCallback, type Dispatch, type SetStateAction } from 'react'
import { useToast } from '@/components/ToastProvider'
import { apiFetch, applyApiFetchFailure } from '@/lib/api-client'
import type { Message } from './chat-types'

export interface UseChatMessageOpsOptions {
  chatId: string
  messages: Message[]
  setMessages: Dispatch<SetStateAction<Message[]>>
  editInput: string
  setEditingMessageId: (id: string | null) => void
  isStreaming: boolean
  sendMessage: (text?: string, opts?: { omitUserPersist?: boolean }) => Promise<void>
}

export function useChatMessageOps({
  chatId,
  messages,
  setMessages,
  editInput,
  setEditingMessageId,
  isStreaming,
  sendMessage,
}: UseChatMessageOpsOptions) {
  const { error: toastError, warning: toastWarning } = useToast()
  const loginRedirectPath = `/chat/${chatId}`

  const saveEdit = useCallback(
    async (messageId: string) => {
      const trimmed = editInput.trim()
      if (!trimmed || isStreaming) return

      setEditingMessageId(null)

      try {
        const patchResult = await apiFetch(`/api/messages/${messageId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: trimmed, truncateAfter: true }),
        })
        if (!patchResult.ok) {
          applyApiFetchFailure(patchResult, {
            toastError,
            toastWarning,
            loginRedirectPath,
            toastTitle: 'Could not edit message',
          })
          return
        }

        const idx = messages.findIndex((m) => m.id === messageId)
        if (idx === -1) return
        const next = messages.slice(0, idx + 1)
        next[idx] = { ...next[idx], content: trimmed }
        setMessages(next)

        await sendMessage(trimmed, { omitUserPersist: true })
      } catch (err) {
        console.error(err)
        toastError('Could not edit message', 'Please try again.')
      }
    },
    [
      editInput,
      isStreaming,
      loginRedirectPath,
      messages,
      sendMessage,
      setEditingMessageId,
      setMessages,
      toastError,
      toastWarning,
    ]
  )

  return { saveEdit }
}
