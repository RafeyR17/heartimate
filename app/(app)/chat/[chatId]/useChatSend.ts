'use client'

/**
 * Send/regenerate lifecycle. See CHAT_MESSAGE_STATE.md (idle → sending → streaming → reconciling).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Dispatch, MutableRefObject, SetStateAction } from 'react'
import { useToast } from '@/components/ToastProvider'
import {
  ApiRequestError,
  apiFetch,
  applyApiErrorDisplay,
  applyApiFetchFailure,
  assertChatPostOk,
  formatChatApiError,
  type ChatApiErrorDisplay,
} from '@/lib/api-client'
import {
  formatStreamOutcomeDisplay,
  readChatPlainTextStream,
} from '@/lib/chat-stream-client'
import { parseChatImageCommand } from '@/lib/chat-image-command'
import {
  type ChatCharacter,
  type Message,
  isUserRole,
} from './chat-types'

export interface UseChatSendOptions {
  chatId: string
  character: ChatCharacter
  messages: Message[]
  setMessages: Dispatch<SetStateAction<Message[]>>
  reconcileWithServer: () => Promise<Message[]>
  input: string
  setInput: (value: string) => void
  stickBottomRef: MutableRefObject<boolean>
  applyStreamHeaders: (headers: Headers) => { specialReply: boolean }
  markAssistantSpecial: (messageId: string, isSpecial: boolean) => void
  clearSpecialStream: () => void
  onAutoRead?: (messageId: string, content: string) => void
  onOpenImagePanel?: (prefill: string) => void
}

export function useChatSend({
  chatId,
  character,
  messages,
  setMessages,
  reconcileWithServer,
  input,
  setInput,
  stickBottomRef,
  applyStreamHeaders,
  markAssistantSpecial,
  clearSpecialStream,
  onAutoRead,
  onQuotaExceeded,
  refreshQuota,
  onOpenImagePanel,
}: UseChatSendOptions & {
  onQuotaExceeded?: (resetIn?: string) => void
  refreshQuota?: () => void
}) {
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [typingGate, setTypingGate] = useState(false)
  const [regenerateCount, setRegenerateCount] = useState(0)

  const { error: toastError, warning: toastWarning } = useToast()
  const abortControllerRef = useRef<AbortController | null>(null)
  const streamingContentRef = useRef('')

  const loginRedirectPath = `/chat/${chatId}`

  const notifyApiError = useCallback(
    (display: ChatApiErrorDisplay) => {
      applyApiErrorDisplay(display, {
        toastError,
        toastWarning,
        loginRedirectPath,
      })
    },
    [loginRedirectPath, toastError, toastWarning]
  )

  const showChatFailure = useCallback(
    (display: ChatApiErrorDisplay, tempUserMsg: Message | null) => {
      if (display.showQuotaModal) {
        onQuotaExceeded?.(display.resetIn)
      }
      notifyApiError(display)
      if (!display.inlineMarkdown) return
      const errorMsg: Message = {
        id: 'error-' + Date.now(),
        role: 'assistant',
        content: display.inlineMarkdown,
        created_at: new Date().toISOString(),
      }
      setMessages((prev) => [
        ...prev.filter((m) => !m.id.startsWith('temp-')),
        ...(tempUserMsg ? [tempUserMsg] : []),
        errorMsg,
      ])
    },
    [notifyApiError, onQuotaExceeded, setMessages]
  )

  useEffect(() => {
    streamingContentRef.current = streamingContent
  }, [streamingContent])

  if (!isStreaming && typingGate) {
    setTypingGate(false)
  }
  if (streamingContent && typingGate) {
    setTypingGate(false)
  }

  useEffect(() => {
    if (!isStreaming || streamingContent) return
    const d = 300 + Math.floor(Math.random() * 500)
    const timer = setTimeout(() => setTypingGate(true), d)
    return () => clearTimeout(timer)
  }, [isStreaming, streamingContent])

  const lastAssistantIndex = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (!isUserRole(messages[i].role)) return i
    }
    return -1
  }, [messages])

  const sendMessage = useCallback(
    async (textToSend?: string, opts?: { omitUserPersist?: boolean }) => {
      const finalMsg = (textToSend ?? input).trim()
      if (!finalMsg || isStreaming) return

      const imageCommand = parseChatImageCommand(finalMsg)
      if (imageCommand !== null) {
        setInput('')
        onOpenImagePanel?.(imageCommand)
        return
      }

      const omitUserPersist = opts?.omitUserPersist === true

      let tempUserMsg: Message | null = null

      if (!omitUserPersist) {
        setInput('')
        stickBottomRef.current = true
        setRegenerateCount(0)

        tempUserMsg = {
          id: 'temp-user-' + Date.now(),
          role: 'user',
          content: finalMsg,
          created_at: new Date().toISOString(),
        }
        setMessages((prev) => [...prev, tempUserMsg!])
      } else {
        stickBottomRef.current = true
      }

      setIsStreaming(true)
      setStreamingContent('')

      abortControllerRef.current = new AbortController()

      const idempotencyKey = crypto.randomUUID()
      let afterReconcile: ((merged: Message[]) => void) | null = null

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Idempotency-Key': idempotencyKey,
          },
          body: JSON.stringify({
            chatId,
            content: finalMsg,
            omitUserPersist,
          }),
          signal: abortControllerRef.current.signal,
        })

        await assertChatPostOk(response)
        if (!response.body) throw new Error('No response body')
        const rel = applyStreamHeaders(response.headers)

        const streamOutcome = await readChatPlainTextStream(response.body, {
          onChunk: setStreamingContent,
          signal: abortControllerRef.current.signal,
        })

        if (streamOutcome.kind !== 'complete') {
          const display = formatStreamOutcomeDisplay(streamOutcome)
          if (streamOutcome.kind === 'aborted' && streamOutcome.content.trim()) {
            const partialMsg: Message = {
              id: 'temp-assistant-' + Date.now(),
              role: 'assistant',
              content: streamOutcome.content + '...',
              created_at: new Date().toISOString(),
            }
            setMessages((prev) => {
              const filtered = prev.filter((m) => !m.id.startsWith('temp-'))
              if (omitUserPersist) return [...filtered, partialMsg]
              if (tempUserMsg) return [...filtered, tempUserMsg, partialMsg]
              return [...filtered, partialMsg]
            })
          }
          if (display) {
            showChatFailure(display, tempUserMsg)
          }
          setStreamingContent('')
          return
        }

        setStreamingContent('')
        const specialReply = rel.specialReply

        try {
          const { capturePostHog } = await import('@/lib/posthog-browser')
          void capturePostHog('message_sent', {
            character_name: character.name,
            chat_id: chatId,
            message_length: finalMsg.length,
          })
        } catch {
          // ignore
        }

        afterReconcile = (merged) => {
          const lastAssistant = [...merged].reverse().find((m) => !isUserRole(m.role))
          if (!lastAssistant) return
          markAssistantSpecial(lastAssistant.id, specialReply)
          onAutoRead?.(lastAssistant.id, lastAssistant.content)
        }
        refreshQuota?.()
      } catch (err: unknown) {
        if (err instanceof ApiRequestError) {
          showChatFailure(err.display, tempUserMsg)
        } else {
          console.error('Streaming error:', err)
          showChatFailure(
            formatChatApiError({
              status: 0,
              error: 'Something went wrong. Please check your connection and try again.',
            }),
            tempUserMsg
          )
        }
        setStreamingContent('')
      } finally {
        setIsStreaming(false)
        clearSpecialStream()
        abortControllerRef.current = null

        const merged = await reconcileWithServer()
        afterReconcile?.(merged)
      }
    },
    [
      input,
      isStreaming,
      onOpenImagePanel,
      chatId,
      character.name,
      stickBottomRef,
      showChatFailure,
      reconcileWithServer,
      setMessages,
      setInput,
      applyStreamHeaders,
      markAssistantSpecial,
      clearSpecialStream,
      onAutoRead,
      refreshQuota,
    ]
  )

  const cancelStream = useCallback(() => {
    abortControllerRef.current?.abort()
  }, [])

  const regenerate = useCallback(async () => {
    if (isStreaming) return
    const lastAssistant = [...messages].reverse().find((m) => !isUserRole(m.role))
    if (!lastAssistant || lastAssistant.id.startsWith('temp-')) return

    setMessages((prev) => prev.filter((m) => m.id !== lastAssistant.id))

    const deleteResult = await apiFetch(`/api/messages/${lastAssistant.id}`, {
      method: 'DELETE',
    })
    if (!deleteResult.ok) {
      applyApiFetchFailure(deleteResult, {
        toastError,
        toastWarning,
        loginRedirectPath,
        toastTitle: 'Could not remove reply',
      })
      return
    }

    const lastUser = [...messages].reverse().find((m) => isUserRole(m.role))
    if (!lastUser) return

    setIsStreaming(true)
    setStreamingContent('')
    abortControllerRef.current = new AbortController()

    const idempotencyKey = crypto.randomUUID()
    let afterReconcile: ((merged: Message[]) => void) | null = null

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({
          chatId,
          content: lastUser.content,
          omitUserPersist: true,
        }),
        signal: abortControllerRef.current.signal,
      })
      await assertChatPostOk(response)
      if (!response.body) throw new Error('No response body')

      const streamOutcome = await readChatPlainTextStream(response.body, {
        onChunk: setStreamingContent,
        signal: abortControllerRef.current.signal,
      })

      if (streamOutcome.kind !== 'complete') {
        const display = formatStreamOutcomeDisplay(streamOutcome, 'regenerate')
        if (display) {
          showChatFailure(display, null)
        }
      } else {
        setRegenerateCount((c) => c + 1)
        afterReconcile = (merged) => {
          const lastAssistant = [...merged].reverse().find((m) => !isUserRole(m.role))
          if (lastAssistant) {
            onAutoRead?.(lastAssistant.id, lastAssistant.content)
          }
        }
      }

      setStreamingContent('')
    } catch (err: unknown) {
      if (err instanceof ApiRequestError) {
        showChatFailure(err.display, null)
      } else {
        const name =
          err && typeof err === 'object' && 'name' in err ? (err as Error).name : ''
        if (name !== 'AbortError') {
          console.error('Regenerate error:', err)
          showChatFailure(
            formatChatApiError({
              status: 0,
              error: 'Could not regenerate. Please try again.',
            }),
            null
          )
        }
      }
      setStreamingContent('')
    } finally {
      setIsStreaming(false)
      abortControllerRef.current = null
      const merged = await reconcileWithServer()
      afterReconcile?.(merged)
    }
  }, [
    isStreaming,
    messages,
    chatId,
    loginRedirectPath,
    reconcileWithServer,
    showChatFailure,
    toastError,
    toastWarning,
    setMessages,
    onAutoRead,
  ])

  const showTypingUi = isStreaming && typingGate && !streamingContent

  const resetRegenerateCount = useCallback(() => {
    setRegenerateCount(0)
  }, [])

  return {
    isStreaming,
    streamingContent,
    showTypingUi,
    regenerateCount,
    lastAssistantIndex,
    sendMessage,
    cancelStream,
    regenerate,
    resetRegenerateCount,
  }
}
