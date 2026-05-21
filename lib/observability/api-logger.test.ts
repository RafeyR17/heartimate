import { describe, expect, it, vi } from 'vitest'
import { createApiLogger } from '@/lib/observability/api-logger'

describe('createApiLogger', () => {
  it('emits structured JSON on span', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const log = createApiLogger({ requestId: 'req-1', route: 'POST /api/chat' })

    await log.span('test', async () => 'ok', { chatId: 'c1' })

    expect(spy).toHaveBeenCalled()
    const line = spy.mock.calls.find((c) =>
      String(c[0]).includes('span.end')
    )?.[0] as string
    expect(line).toBeTruthy()
    const parsed = JSON.parse(line) as Record<string, unknown>
    expect(parsed.requestId).toBe('req-1')
    expect(parsed.route).toBe('POST /api/chat')
    expect(parsed.event).toBe('span.end')
    expect(parsed.ok).toBe(true)
    spy.mockRestore()
  })
})
