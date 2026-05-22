import { describe, expect, it, vi } from 'vitest'
import {
  ApiRequestError,
  apiFetch,
  fetchApiJson,
  formatApiError,
  formatChatApiError,
  parseApiErrorResponse,
} from '@/lib/api-client'

function jsonResponse(
  status: number,
  body: Record<string, unknown>,
  headers?: Record<string, string>
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  })
}

describe('parseApiErrorResponse', () => {
  it('reads error and retryAfter from JSON body', async () => {
    const res = jsonResponse(429, {
      success: false,
      error: 'Too many chat requests. Please wait before trying again.',
      retryAfter: 45,
    })
    const parsed = await parseApiErrorResponse(res)
    expect(parsed.status).toBe(429)
    expect(parsed.retryAfter).toBe(45)
    expect(parsed.error).toContain('Too many')
  })

  it('falls back to Retry-After header when body omits retryAfter', async () => {
    const res = jsonResponse(
      429,
      { success: false, error: 'Rate limited' },
      { 'Retry-After': '30' }
    )
    const parsed = await parseApiErrorResponse(res)
    expect(parsed.retryAfter).toBe(30)
  })

  it('handles invalid JSON gracefully', async () => {
    const res = new Response('not json', { status: 500, statusText: 'Server Error' })
    const parsed = await parseApiErrorResponse(res)
    expect(parsed.status).toBe(500)
    expect(parsed.error).toBe('Invalid JSON response')
  })
})

describe('formatApiError', () => {
  it('uses resource-specific toast title from code', () => {
    const display = formatApiError({
      status: 404,
      error: 'Message not found',
      code: 'MESSAGE_NOT_FOUND',
    })
    expect(display.toastTitle).toBe('Message not found')
  })
})

describe('formatChatApiError', () => {
  it('maps 429 to slow-down copy with seconds', () => {
    const display = formatChatApiError({
      status: 429,
      error: 'Too many',
      retryAfter: 12,
    })
    expect(display.toastMessage).toBe('Slow down — try again in 12s')
    expect(display.inlineMarkdown).toContain('12s')
  })

  it('maps daily_chat_limit 429 to daily copy', () => {
    const display = formatChatApiError({
      status: 429,
      error: "You've used all 20 messages for today.",
      code: 'daily_chat_limit',
    })
    expect(display.toastTitle).toBe('Daily limit reached')
    expect(display.toastMessage).toContain('20 messages')
  })

  it('maps 503 to chat unavailable copy', () => {
    const display = formatChatApiError({
      status: 503,
      error: 'AI service unavailable',
    })
    expect(display.toastMessage).toBe('AI service unavailable')
    expect(display.toastTitle).toBe('Chat unavailable')
  })

  it('maps 503 idempotency migration errors with setup hint', () => {
    const display = formatChatApiError({
      status: 503,
      error: 'Chat idempotency is not configured. Apply migration 20240530_chat_idempotency.sql',
    })
    expect(display.toastTitle).toBe('Database migration needed')
    expect(display.toastMessage).toMatch(/20240530_chat_idempotency/)
  })

  it('maps 409 to still processing copy', () => {
    const display = formatChatApiError({
      status: 409,
      error: 'Duplicate chat request still processing',
    })
    expect(display.toastMessage).toBe('Still processing your last message…')
  })

  it('maps 401 to login redirect', () => {
    const display = formatChatApiError({ status: 401, error: 'Unauthorized' })
    expect(display.redirectToLogin).toBe(true)
  })

  it('maps 413 to message too long', () => {
    const display = formatChatApiError({
      status: 413,
      error: 'Message exceeds 4000 characters',
    })
    expect(display.toastTitle).toBe('Message too long')
  })
})

describe('formatApiError', () => {
  it('overrides toast title and can omit inline copy', () => {
    const display = formatApiError(
      { status: 500, error: 'Database error' },
      { toastTitle: 'Could not load messages', inline: false }
    )
    expect(display.toastTitle).toBe('Could not load messages')
    expect(display.inlineMarkdown).toBe('')
  })
})

describe('apiFetch', () => {
  it('returns success with parsed JSON body', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(200, { success: true, personas: [{ id: 'p1' }] })
    )
    vi.stubGlobal('fetch', fetchMock)
    const result = await apiFetch<{ personas: { id: string }[] }>('/api/personas')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.personas).toHaveLength(1)
    }
    vi.unstubAllGlobals()
  })

  it('returns failure with error and status without throwing', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(429, {
        success: false,
        error: 'Too many requests',
        retryAfter: 15,
      })
    )
    vi.stubGlobal('fetch', fetchMock)
    const result = await apiFetch('/api/chat')
    expect(result).toEqual({
      ok: false,
      error: 'Too many requests',
      status: 429,
      retryAfter: 15,
      code: undefined,
    })
    vi.unstubAllGlobals()
  })

  it('returns network failure with status 0', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('Failed to fetch'))
    vi.stubGlobal('fetch', fetchMock)
    const result = await apiFetch('/api/chats')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.status).toBe(0)
      expect(result.error).toContain('Failed to fetch')
    }
    vi.unstubAllGlobals()
  })
})

describe('fetchApiJson', () => {
  it('throws ApiRequestError with parsed body on failure', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(404, { success: false, error: 'Chat not found' })
    )
    vi.stubGlobal('fetch', fetchMock)
    await expect(fetchApiJson('/api/chats/x')).rejects.toBeInstanceOf(ApiRequestError)
    vi.unstubAllGlobals()
  })
})
