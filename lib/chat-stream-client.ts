import { getRelationshipLevel } from '@/lib/affection'
import type { ChatApiErrorDisplay } from '@/lib/api-client'
import { parseChatStreamMeta } from '@/lib/api-contract'

/** Server partial-finalize marker (see app/api/chat/route.ts). */
export const CHAT_STREAM_INTERRUPTED_MARKER = '*[message interrupted]*'

export type ChatStreamReadOutcome =
  | { kind: 'complete'; content: string }
  | { kind: 'aborted'; content: string }
  | { kind: 'interrupted'; content: string }
  | { kind: 'failed' }

export function hasServerInterruptedMarker(content: string): boolean {
  return content.includes(CHAT_STREAM_INTERRUPTED_MARKER)
}

/**
 * Read POST /api/chat plain-text body. Distinguishes user abort vs mid-stream failure.
 */
export async function readChatPlainTextStream(
  body: ReadableStream<Uint8Array>,
  opts?: {
    onChunk?: (accumulated: string) => void
    signal?: AbortSignal
  }
): Promise<ChatStreamReadOutcome> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let content = ''
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        return { kind: 'complete', content }
      }
      content += decoder.decode(value, { stream: true })
      opts?.onChunk?.(content)
    }
  } catch (err: unknown) {
    const name = err && typeof err === 'object' && 'name' in err ? (err as Error).name : ''
    const aborted = name === 'AbortError' || opts?.signal?.aborted === true
    if (aborted) {
      return { kind: 'aborted', content }
    }
    if (content.trim()) {
      return { kind: 'interrupted', content }
    }
    return { kind: 'failed' }
  } finally {
    try {
      reader.releaseLock()
    } catch {
      // ignore if already released
    }
  }
}

export function formatStreamOutcomeDisplay(
  outcome: Exclude<ChatStreamReadOutcome, { kind: 'complete' }>,
  context: 'send' | 'regenerate' = 'send'
): ChatApiErrorDisplay | null {
  if (outcome.kind === 'aborted') {
    return outcome.content.trim()
      ? {
          toastTitle: 'Generation stopped',
          toastMessage: 'You stopped the reply.',
          inlineMarkdown: '',
        }
      : null
  }
  if (outcome.kind === 'interrupted') {
    const partialNote = hasServerInterruptedMarker(outcome.content)
      ? 'Partial reply was saved.'
      : 'Partial reply may have been saved.'
    return {
      toastTitle: 'Reply interrupted',
      toastMessage: partialNote,
      inlineMarkdown: '*Reply interrupted — partial reply saved.*',
    }
  }
  return {
    toastTitle: context === 'regenerate' ? 'Regeneration failed' : 'Reply failed',
    toastMessage: 'The reply failed before any text arrived. Try again.',
    inlineMarkdown: '*Reply failed completely. Please try again.*',
  }
}

export type StreamRelationshipUpdate = {
  specialReply: boolean
  affectionScore: number
  relationshipLevel: string
  levelUp: boolean
  levelInfo: ReturnType<typeof getRelationshipLevel>
}

/** Apply POST /api/chat stream headers to client relationship state. */
export function streamRelationshipFromHeaders(
  headers: Headers,
  fallbackScore: number,
  fallbackLevel: string
): StreamRelationshipUpdate {
  const meta = parseChatStreamMeta(headers)
  const affectionScore = meta.relationshipScore || fallbackScore
  const relationshipLevel = meta.relationshipLevel || fallbackLevel
  return {
    specialReply: meta.specialReply,
    affectionScore,
    relationshipLevel,
    levelUp: meta.levelUp,
    levelInfo: getRelationshipLevel(affectionScore),
  }
}
