import { describe, expect, it, vi } from 'vitest'
import { logRouteError, routeFailure, serializeRouteError } from '@/lib/observability/route-error'

describe('serializeRouteError', () => {
  it('returns message for Error instances', () => {
    expect(serializeRouteError(new Error('boom'))).toBe('boom')
  })
})

describe('logRouteError', () => {
  it('calls log.error with context and message only', () => {
    const log = { error: vi.fn() }
    logRouteError(log as never, 'test.event', new Error('secret stack'), {
      chatId: 'c1',
    })
    expect(log.error).toHaveBeenCalledWith('test.event', {
      chatId: 'c1',
      error: 'secret stack',
    })
  })
})

describe('routeFailure', () => {
  it('returns apiError without leaking stack in body', async () => {
    const log = { error: vi.fn() }
    const res = routeFailure(
      log as never,
      'chats.patch_failed',
      new Error('PG connection refused'),
      { chatId: 'chat-1' },
      {
        message: 'Failed to update chat',
        status: 500,
        code: 'INTERNAL_ERROR',
      }
    )
    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.success).toBe(false)
    expect(json.error).toBe('Failed to update chat')
    expect(json.code).toBe('INTERNAL_ERROR')
    expect(JSON.stringify(json)).not.toContain('PG connection')
  })
})
