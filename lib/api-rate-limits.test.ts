import { describe, expect, it, vi } from 'vitest'
import { getServiceRoleClient } from '@/lib/service-role'
import { createMockSupabaseClient } from '@/lib/test/mock-supabase'
import { API_RATE_LIMITS, assertApiRateLimit } from '@/lib/api-rate-limits'

describe('assertApiRateLimit', () => {
  it('returns null when slot acquired', async () => {
    const admin = createMockSupabaseClient({
      rpc: vi.fn().mockResolvedValue({ data: true, error: null }),
    })
    vi.mocked(getServiceRoleClient).mockReturnValueOnce(admin)

    const result = await assertApiRateLimit('user-1', 'report')
    expect(result).toBeNull()
    expect(admin.rpc).toHaveBeenCalledWith('try_acquire_api_rate_slot', {
      p_user_id: 'user-1',
      p_action: 'report',
      p_max: API_RATE_LIMITS.report.max,
      p_since: expect.any(String),
    })
  })

  it('returns 429 when over cap', async () => {
    vi.mocked(getServiceRoleClient).mockReturnValueOnce(
      createMockSupabaseClient({
        rpc: vi.fn().mockResolvedValue({ data: false, error: null }),
      })
    )
    const result = await assertApiRateLimit('user-1', 'avatar_upload')
    expect(result?.status).toBe(429)
  })

  it('returns 429 when over cap for likes', async () => {
    vi.mocked(getServiceRoleClient).mockReturnValueOnce(
      createMockSupabaseClient({
        rpc: vi.fn().mockResolvedValue({ data: false, error: null }),
      })
    )
    const result = await assertApiRateLimit('user-1', 'character_like')
    expect(result?.status).toBe(429)
  })

  it('returns 503 when ledger RPC fails', async () => {
    vi.mocked(getServiceRoleClient).mockReturnValueOnce(
      createMockSupabaseClient({
        rpc: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'db down' },
        }),
      })
    )
    const result = await assertApiRateLimit('user-1', 'report')
    expect(result?.status).toBe(503)
  })
})
