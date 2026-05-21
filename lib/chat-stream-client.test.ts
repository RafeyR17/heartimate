import { describe, expect, it } from 'vitest'
import {
  formatStreamOutcomeDisplay,
  hasServerInterruptedMarker,
  readChatPlainTextStream,
  streamRelationshipFromHeaders,
  CHAT_STREAM_INTERRUPTED_MARKER,
} from '@/lib/chat-stream-client'

describe('streamRelationshipFromHeaders', () => {
  it('maps chat stream headers to client relationship state', () => {
    const headers = new Headers({
      'X-Special-Reply': 'true',
      'X-Level-Up': 'true',
      'X-Relationship-Level': 'friend',
      'X-Relationship-Score': '55',
    })
    const update = streamRelationshipFromHeaders(headers, 10, 'stranger')
    expect(update.specialReply).toBe(true)
    expect(update.levelUp).toBe(true)
    expect(update.affectionScore).toBe(55)
    expect(update.relationshipLevel).toBe('friend')
    expect(update.levelInfo.level).toBe('friend')
  })

  it('falls back when headers are missing', () => {
    const update = streamRelationshipFromHeaders(new Headers(), 5, 'stranger')
    expect(update.affectionScore).toBe(5)
    expect(update.relationshipLevel).toBe('stranger')
  })
})

describe('readChatPlainTextStream', () => {
  it('returns complete when stream closes normally', async () => {
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('Hello'))
        controller.close()
      },
    })
    const outcome = await readChatPlainTextStream(body)
    expect(outcome).toEqual({ kind: 'complete', content: 'Hello' })
  })

  it('returns interrupted when stream errors after partial data', async () => {
    const body = new ReadableStream({
      async start(controller) {
        controller.enqueue(new TextEncoder().encode('Partial'))
        await Promise.resolve()
        controller.error(new Error('upstream failed'))
      },
    })
    const outcome = await readChatPlainTextStream(body)
    expect(outcome).toEqual({ kind: 'interrupted', content: 'Partial' })
  })

  it('returns failed when stream errors with no data', async () => {
    const body = new ReadableStream({
      start(controller) {
        controller.error(new Error('upstream failed'))
      },
    })
    const outcome = await readChatPlainTextStream(body)
    expect(outcome).toEqual({ kind: 'failed' })
  })

  it('returns aborted when read throws AbortError', async () => {
    const body = new ReadableStream({
      async start(controller) {
        controller.enqueue(new TextEncoder().encode('x'))
        await Promise.resolve()
        const err = new Error('Aborted')
        err.name = 'AbortError'
        controller.error(err)
      },
    })
    const outcome = await readChatPlainTextStream(body)
    expect(outcome.kind).toBe('aborted')
    if (outcome.kind === 'aborted') {
      expect(outcome.content).toBe('x')
    }
  })
})

describe('formatStreamOutcomeDisplay', () => {
  it('describes interrupted partial replies', () => {
    const display = formatStreamOutcomeDisplay({
      kind: 'interrupted',
      content: `Hi ${CHAT_STREAM_INTERRUPTED_MARKER}`,
    })
    expect(display?.toastTitle).toBe('Reply interrupted')
    expect(display?.inlineMarkdown).toContain('partial reply saved')
  })

  it('returns null for abort with no content', () => {
    expect(formatStreamOutcomeDisplay({ kind: 'aborted', content: '' })).toBeNull()
  })
})

describe('hasServerInterruptedMarker', () => {
  it('detects server marker', () => {
    expect(hasServerInterruptedMarker(`text ${CHAT_STREAM_INTERRUPTED_MARKER}`)).toBe(true)
  })
})
