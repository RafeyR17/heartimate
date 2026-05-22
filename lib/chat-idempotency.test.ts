import { describe, expect, it, vi } from 'vitest'
import { getServiceRoleClient } from '@/lib/service-role'
import { createMockSupabaseClient } from '@/lib/test/mock-supabase'
import { claimChatIdempotency } from '@/lib/chat-idempotency'

describe('claimChatIdempotency', () => {
  it('fails closed when claim RPC errors', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.mocked(getServiceRoleClient).mockReturnValueOnce(
      createMockSupabaseClient({
        rpc: vi.fn().mockResolvedValue({ data: null, error: { message: 'db down' } }),
      })
    )
    const result = await claimChatIdempotency('user-1', 'chat-1', 'idem-key-12345678')
    expect(result.action).toBe('unavailable')
    if (result.action === 'unavailable') {
      expect(result.response.status).toBe(503)
    }
    vi.unstubAllEnvs()
  })

  it('proceeds in development when claim RPC is missing (migration not applied)', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.mocked(getServiceRoleClient).mockReturnValueOnce(
      createMockSupabaseClient({
        rpc: vi.fn().mockResolvedValue({
          data: null,
          error: {
            code: 'PGRST202',
            message: 'Could not find the function public.claim_chat_idempotency',
          },
        }),
      })
    )
    const result = await claimChatIdempotency('user-1', 'chat-1', 'idem-key-12345678')
    expect(result.action).toBe('proceed')
    vi.unstubAllEnvs()
  })

  it('returns migration hint in production when claim RPC is missing', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.mocked(getServiceRoleClient).mockReturnValueOnce(
      createMockSupabaseClient({
        rpc: vi.fn().mockResolvedValue({
          data: null,
          error: {
            code: 'PGRST202',
            message: 'Could not find the function public.claim_chat_idempotency',
          },
        }),
      })
    )
    const result = await claimChatIdempotency('user-1', 'chat-1', 'idem-key-12345678')
    expect(result.action).toBe('unavailable')
    if (result.action === 'unavailable') {
      expect(result.response.status).toBe(503)
      const json = (await result.response.json()) as { error?: string }
      expect(json.error).toMatch(/20240530_chat_idempotency/)
    }
    vi.unstubAllEnvs()
  })

  it('fails closed when replay has no cached body', async () => {
    vi.mocked(getServiceRoleClient).mockReturnValueOnce(
      createMockSupabaseClient({
        rpc: vi.fn().mockResolvedValue({ data: 'replay', error: null }),
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      })
    )
    const result = await claimChatIdempotency('user-1', 'chat-1', 'idem-key-12345678')
    expect(result.action).toBe('unavailable')
  })

  it('replays cached response', async () => {
    vi.mocked(getServiceRoleClient).mockReturnValue(
      createMockSupabaseClient({
        rpc: vi.fn().mockResolvedValue({ data: 'replay', error: null }),
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: {
              response_body: 'cached reply',
              response_headers: { 'X-Relationship-Score': '5' },
            },
            error: null,
          }),
        }),
      })
    )
    const result = await claimChatIdempotency('user-1', 'chat-1', 'idem-key-12345678')
    expect(result.action).toBe('replay')
    if (result.action === 'replay') {
      expect(result.body).toBe('cached reply')
      expect(result.headers['X-Relationship-Score']).toBe('5')
    }
  })
})
