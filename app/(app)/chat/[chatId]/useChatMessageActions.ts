'use client'

/** Message reactions are session-only (not persisted). See docs/CLIENT_EPHEMERAL_STATE.md */

import { useCallback, useState } from 'react'
import { useToast } from '@/components/ToastProvider'
import { apiFetch, applyApiFetchFailure } from '@/lib/api-client'

export interface UseChatMessageActionsOptions {
  chatId: string
  removeMessageFromState: (id: string) => void
}

export function useChatMessageActions({
  chatId,
  removeMessageFromState,
}: UseChatMessageActionsOptions) {
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [myReaction, setMyReaction] = useState<Record<string, string | undefined>>({})

  const { error: toastError, warning: toastWarning } = useToast()
  const loginRedirectPath = `/chat/${chatId}`

  const deleteMessageConfirmed = useCallback(
    async (id: string) => {
      setPendingDeleteId(null)
      try {
        const result = await apiFetch(`/api/messages/${id}`, { method: 'DELETE' })
        if (!result.ok) {
          applyApiFetchFailure(result, {
            toastError,
            toastWarning,
            loginRedirectPath,
            toastTitle: 'Could not delete message',
          })
          return
        }
        removeMessageFromState(id)
      } catch (err) {
        console.error(err)
        toastError('Could not delete message', 'Please try again.')
      }
    },
    [loginRedirectPath, removeMessageFromState, toastError, toastWarning]
  )

  const handleCopyMessage = useCallback(async (msgId: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedMessageId(msgId)
      setTimeout(() => setCopiedMessageId(null), 2000)
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }, [])

  const toggleReaction = useCallback((msgId: string, emoji: string) => {
    setMyReaction((prev) => {
      const cur = prev[msgId]
      const next = { ...prev }
      if (cur === emoji) {
        delete next[msgId]
      } else {
        next[msgId] = emoji
      }
      return next
    })
  }, [])

  return {
    copiedMessageId,
    pendingDeleteId,
    setPendingDeleteId,
    myReaction,
    deleteMessageConfirmed,
    handleCopyMessage,
    toggleReaction,
  }
}
