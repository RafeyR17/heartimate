'use client'

import { useEffect, useState } from 'react'
import {
  chatMessagesSnapshotKey,
  chatRelationshipSnapshotKey,
} from '@/lib/chat-server-sync'
import type { ChatCharacter, Message } from './chat-types'
import { useChatComposerState } from './useChatComposerState'
import { useChatMessageActions } from './useChatMessageActions'
import { useChatMessageOps } from './useChatMessageOps'
import { useChatMessages } from './useChatMessages'
import { useChatRelationship } from './useChatRelationship'
import { useChatSend } from './useChatSend'

export interface UseChatStreamOptions {
  chatId: string
  character: ChatCharacter
  initialMessages: Message[]
  initialHasMore?: boolean
  initialOlderCursor?: string | null
  initialAffectionScore: number
  initialRelationshipLevel: string
  stickBottomRef: React.MutableRefObject<boolean>
  onAutoRead?: (messageId: string, content: string) => void
}

/** Composes focused chat hooks; keeps the same surface API for ChatClient. */
export function useChatStream({
  chatId,
  character,
  initialMessages,
  initialHasMore = false,
  initialOlderCursor = null,
  initialAffectionScore,
  initialRelationshipLevel,
  stickBottomRef,
  onAutoRead,
}: UseChatStreamOptions) {
  const messagesState = useChatMessages({
    chatId,
    initialMessages,
    initialHasMore,
    initialOlderCursor,
  })

  const relationship = useChatRelationship({
    initialAffectionScore,
    initialRelationshipLevel,
    characterName: character.name,
  })

  const [syncedMessagesKey, setSyncedMessagesKey] = useState(() =>
    chatMessagesSnapshotKey(chatId, initialMessages, initialHasMore, initialOlderCursor)
  )
  const [syncedRelationshipKey, setSyncedRelationshipKey] = useState(() =>
    chatRelationshipSnapshotKey(chatId, initialAffectionScore, initialRelationshipLevel)
  )

  const composer = useChatComposerState()

  const send = useChatSend({
    chatId,
    character,
    messages: messagesState.messages,
    setMessages: messagesState.setMessages,
    reconcileWithServer: messagesState.reconcileWithServer,
    input: composer.input,
    setInput: composer.setInput,
    stickBottomRef,
    applyStreamHeaders: relationship.applyStreamHeaders,
    markAssistantSpecial: relationship.markAssistantSpecial,
    clearSpecialStream: relationship.clearSpecialStream,
    onAutoRead,
  })

  const actions = useChatMessageActions({
    chatId,
    removeMessageFromState: messagesState.removeMessageFromState,
  })

  useEffect(() => {
    if (send.isStreaming) return
    const key = chatMessagesSnapshotKey(
      chatId,
      initialMessages,
      initialHasMore,
      initialOlderCursor
    )
    if (key === syncedMessagesKey) return
    
    const timeoutId = setTimeout(() => {
      messagesState.applyServerSnapshot({
        initialMessages,
        initialHasMore,
        initialOlderCursor,
      })
      setSyncedMessagesKey(key)
    }, 0)
    return () => clearTimeout(timeoutId)
  }, [
    chatId,
    initialMessages,
    initialHasMore,
    initialOlderCursor,
    send.isStreaming,
    syncedMessagesKey,
    messagesState,
  ])

  useEffect(() => {
    if (send.isStreaming) return
    const key = chatRelationshipSnapshotKey(
      chatId,
      initialAffectionScore,
      initialRelationshipLevel
    )
    if (key === syncedRelationshipKey) return
    
    const timeoutId = setTimeout(() => {
      relationship.applyServerSnapshot({
        initialAffectionScore,
        initialRelationshipLevel,
      })
      setSyncedRelationshipKey(key)
    }, 0)
    return () => clearTimeout(timeoutId)
  }, [
    chatId,
    initialAffectionScore,
    initialRelationshipLevel,
    send.isStreaming,
    syncedRelationshipKey,
    relationship,
  ])

  const ops = useChatMessageOps({
    chatId,
    messages: messagesState.messages,
    setMessages: messagesState.setMessages,
    editInput: composer.editInput,
    setEditingMessageId: composer.setEditingMessageId,
    isStreaming: send.isStreaming,
    sendMessage: send.sendMessage,
  })

  return {
    messages: messagesState.messages,
    input: composer.input,
    setInput: composer.setInput,
    isStreaming: send.isStreaming,
    streamingContent: send.streamingContent,
    showTypingUi: send.showTypingUi,
    editingMessageId: composer.editingMessageId,
    setEditingMessageId: composer.setEditingMessageId,
    editInput: composer.editInput,
    setEditInput: composer.setEditInput,
    copiedMessageId: actions.copiedMessageId,
    pendingDeleteId: actions.pendingDeleteId,
    setPendingDeleteId: actions.setPendingDeleteId,
    exitingIds: messagesState.exitingIds,
    regenerateCount: send.regenerateCount,
    myReaction: actions.myReaction,
    affectionScore: relationship.affectionScore,
    relationshipLevel: relationship.relationshipLevel,
    specialStream: relationship.specialStream,
    justSpecialIds: relationship.justSpecialIds,
    levelFlashColor: relationship.levelFlashColor,
    levelToast: relationship.levelToast,
    lastAssistantIndex: send.lastAssistantIndex,
    relInfo: relationship.relInfo,
    sendMessage: send.sendMessage,
    cancelStream: send.cancelStream,
    regenerate: send.regenerate,
    saveEdit: ops.saveEdit,
    deleteMessageConfirmed: actions.deleteMessageConfirmed,
    handleCopyMessage: actions.handleCopyMessage,
    toggleReaction: actions.toggleReaction,
    clearMessages: () => {
      messagesState.clearMessages()
      send.resetRegenerateCount()
    },
    hasMoreOlder: messagesState.hasMoreOlder,
    loadingOlder: messagesState.loadingOlder,
    loadOlderMessages: messagesState.loadOlderMessages,
  }
}
