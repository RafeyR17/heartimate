import type { Message } from '@/lib/chat-ui-types'

/** Stable fingerprint of RSC-provided message page for resync when props change. */
export function chatMessagesSnapshotKey(
  chatId: string,
  initialMessages: Message[],
  initialHasMore: boolean,
  initialOlderCursor: string | null
): string {
  const lastId = initialMessages.at(-1)?.id ?? ''
  const firstId = initialMessages[0]?.id ?? ''
  return `${chatId}|${initialMessages.length}|${firstId}|${lastId}|${initialHasMore}|${initialOlderCursor ?? ''}`
}

export function chatRelationshipSnapshotKey(
  chatId: string,
  initialAffectionScore: number,
  initialRelationshipLevel: string
): string {
  return `${chatId}|${initialAffectionScore}|${initialRelationshipLevel}`
}

/** Client-only optimistic / error rows; never come from GET messages. */
export function isEphemeralMessageId(id: string): boolean {
  return id.startsWith('temp-') || id.startsWith('error-')
}
