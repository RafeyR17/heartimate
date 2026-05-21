'use client'

/** Message list + pagination (TanStack Query cache). State machine: CHAT_MESSAGE_STATE.md */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/components/ToastProvider'
import { apiFetch, applyApiFetchFailure } from '@/lib/api-client'
import { isEphemeralMessageId } from '@/lib/chat-server-sync'
import {
  CHAT_UI_MESSAGE_PAGE_SIZE,
  fetchChatMessagesPage,
  parseMessagesPageResponse,
  type ChatMessagesQueryData,
} from '@/lib/chat-messages-client'
import type { Message } from './chat-types'
import { queryKeys } from '@/lib/query/keys'

export interface UseChatMessagesOptions {
  chatId: string
  initialMessages: Message[]
  initialHasMore?: boolean
  initialOlderCursor?: string | null
}

export interface ChatMessagesServerSnapshot {
  initialMessages: Message[]
  initialHasMore: boolean
  initialOlderCursor: string | null
}

function mergeWithOlderPrefix(current: Message[], latest: Message[]): Message[] {
  if (current.length === 0) return latest
  const latestIds = new Set(latest.map((m) => m.id))
  const oldestCreated = latest[0]?.created_at
  if (!oldestCreated) return latest
  const prefix = current.filter(
    (m) => !latestIds.has(m.id) && m.created_at < oldestCreated
  )
  return [...prefix, ...latest]
}

function initialCache(
  initialMessages: Message[],
  initialHasMore: boolean,
  initialOlderCursor: string | null
): ChatMessagesQueryData {
  return {
    messages: initialMessages,
    hasMoreOlder: initialHasMore,
    olderCursor: initialOlderCursor,
  }
}

export function useChatMessages({
  chatId,
  initialMessages,
  initialHasMore = false,
  initialOlderCursor = null,
}: UseChatMessagesOptions) {
  const queryClient = useQueryClient()
  const queryKey = queryKeys.chat.messages(chatId)
  const [exitingIds, setExitingIds] = useState<Set<string>>(new Set())
  const [loadingOlder, setLoadingOlder] = useState(false)

  const messagesRef = useRef(initialMessages)
  const { error: toastError, warning: toastWarning } = useToast()
  const loginRedirectPath = `/chat/${chatId}`

  const { data: cache = initialCache(initialMessages, initialHasMore, initialOlderCursor) } =
    useQuery<ChatMessagesQueryData>({
      queryKey,
      queryFn: () => fetchChatMessagesPage(chatId),
      initialData: () =>
        initialCache(initialMessages, initialHasMore, initialOlderCursor),
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
    })

  const messages = cache.messages
  const hasMoreOlder = cache.hasMoreOlder
  const olderCursor = cache.olderCursor

  const patchCache = useCallback(
    (patch: (prev: ChatMessagesQueryData) => ChatMessagesQueryData) => {
      queryClient.setQueryData<ChatMessagesQueryData>(queryKey, (prev) =>
        patch(prev ?? initialCache(initialMessages, initialHasMore, initialOlderCursor))
      )
    },
    [queryClient, queryKey, initialMessages, initialHasMore, initialOlderCursor]
  )

  const setMessages = useCallback(
    (updater: SetStateAction<Message[]>) => {
      patchCache((prev) => ({
        ...prev,
        messages:
          typeof updater === 'function' ? updater(prev.messages) : updater,
      }))
    },
    [patchCache]
  ) as Dispatch<SetStateAction<Message[]>>

  const applyServerSnapshot = useCallback(
    (snapshot: ChatMessagesServerSnapshot) => {
      queryClient.setQueryData<ChatMessagesQueryData>(
        queryKey,
        initialCache(
          snapshot.initialMessages,
          snapshot.initialHasMore,
          snapshot.initialOlderCursor
        )
      )
      setExitingIds(new Set())
      messagesRef.current = snapshot.initialMessages
    },
    [queryClient, queryKey]
  )

  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  const refetchLatestMessages = useCallback(
    async (current: Message[]): Promise<Message[]> => {
      const result = await apiFetch(
        `/api/chats/${chatId}/messages?limit=${CHAT_UI_MESSAGE_PAGE_SIZE}`
      )
      if (!result.ok) {
        applyApiFetchFailure(result, {
          toastError,
          toastWarning,
          loginRedirectPath,
          toastTitle: 'Could not refresh messages',
        })
        return current
      }
      const page = parseMessagesPageResponse(result.data)
      if (page.messages.length === 0) return current
      return mergeWithOlderPrefix(current, page.messages)
    },
    [chatId, loginRedirectPath, toastError, toastWarning]
  )

  const loadOlderMessages = useCallback(async () => {
    if (loadingOlder || !olderCursor || !hasMoreOlder) return
    setLoadingOlder(true)
    try {
      const result = await apiFetch(
        `/api/chats/${chatId}/messages?limit=${CHAT_UI_MESSAGE_PAGE_SIZE}&before=${encodeURIComponent(olderCursor)}`
      )
      if (!result.ok) {
        applyApiFetchFailure(result, {
          toastError,
          toastWarning,
          loginRedirectPath,
          toastTitle: 'Could not load older messages',
        })
        return
      }
      const page = parseMessagesPageResponse(result.data)
      if (page.messages.length === 0) {
        patchCache((prev) => ({ ...prev, hasMoreOlder: false }))
        return
      }
      patchCache((prev) => {
        const ids = new Set(prev.messages.map((m) => m.id))
        const older = page.messages.filter((m) => !ids.has(m.id))
        return {
          messages: [...older, ...prev.messages],
          olderCursor: page.nextCursor,
          hasMoreOlder: page.hasMore,
        }
      })
    } catch (err) {
      console.error('Load older messages failed:', err)
      toastError('Could not load older messages', 'Please try again.')
    } finally {
      setLoadingOlder(false)
    }
  }, [
    chatId,
    hasMoreOlder,
    loadingOlder,
    loginRedirectPath,
    olderCursor,
    patchCache,
    toastError,
    toastWarning,
  ])

  const removeMessageFromState = useCallback((id: string) => {
    setExitingIds((s) => new Set(s).add(id))
    setTimeout(() => {
      setMessages((prev) => prev.filter((m) => m.id !== id))
      setExitingIds((s) => {
        const n = new Set(s)
        n.delete(id)
        return n
      })
    }, 300)
  }, [setMessages])

  const clearMessages = useCallback(() => {
    patchCache((prev) => ({
      ...prev,
      messages: [],
    }))
    messagesRef.current = []
  }, [patchCache])

  const reconcileWithServer = useCallback(async (): Promise<Message[]> => {
    const base = messagesRef.current.filter((m) => !isEphemeralMessageId(m.id))
    const merged = await refetchLatestMessages(base)
    patchCache((prev) => ({ ...prev, messages: merged }))
    messagesRef.current = merged
    return merged
  }, [patchCache, refetchLatestMessages])

  return {
    messages,
    setMessages,
    messagesRef,
    hasMoreOlder,
    loadingOlder,
    loadOlderMessages,
    refetchLatestMessages,
    reconcileWithServer,
    applyServerSnapshot,
    exitingIds,
    removeMessageFromState,
    clearMessages,
  }
}
