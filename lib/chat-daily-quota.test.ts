import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getServiceRoleClient } from '@/lib/service-role'
import { createMockSupabaseClient, createQueryChain } from '@/lib/test/mock-supabase'
import {
  assertDailyChatQuota,
  CHAT_DAILY_MESSAGE_LIMIT_DEFAULT,
  resolveDailyChatLimit,
  secondsUntilUtcMidnight,
  startOfUtcDayIso,
} from '@/lib/chat-daily-quota'

function mockUserQuotaRow(row: Record<string, unknown>) {
  vi.mocked(getServiceRoleClient).mockImplementation(() =>
    createMockSupabaseClient({
      from: (table) => {
        if (table !== 'users') {
          return createQueryChain(async () => ({ data: null, error: null }))
        }
        return createQueryChain(async () => ({ data: row, error: null }))
      },
    })
  )
}

describe('resolveDailyChatLimit', () => {
  const prev = process.env.CHAT_DAILY_MESSAGE_LIMIT

  afterEach(() => {
    if (prev === undefined) delete process.env.CHAT_DAILY_MESSAGE_LIMIT
    else process.env.CHAT_DAILY_MESSAGE_LIMIT = prev
  })

  it('defaults to 20 when unset', () => {
    delete process.env.CHAT_DAILY_MESSAGE_LIMIT
    expect(resolveDailyChatLimit()).toBe(CHAT_DAILY_MESSAGE_LIMIT_DEFAULT)
  })

  it('returns null for 0 or unlimited', () => {
    process.env.CHAT_DAILY_MESSAGE_LIMIT = '0'
    expect(resolveDailyChatLimit()).toBeNull()
    process.env.CHAT_DAILY_MESSAGE_LIMIT = 'unlimited'
    expect(resolveDailyChatLimit()).toBeNull()
  })

  it('parses a positive override', () => {
    process.env.CHAT_DAILY_MESSAGE_LIMIT = '50'
    expect(resolveDailyChatLimit()).toBe(50)
  })
})

describe('startOfUtcDayIso / secondsUntilUtcMidnight', () => {
  it('uses UTC calendar day boundaries', () => {
    const noonUtc = new Date('2026-05-21T12:00:00.000Z')
    expect(startOfUtcDayIso(noonUtc)).toBe('2026-05-21T00:00:00.000Z')
    expect(secondsUntilUtcMidnight(noonUtc)).toBe(12 * 60 * 60)
  })
})

describe('assertDailyChatQuota', () => {
  const prev = process.env.CHAT_DAILY_MESSAGE_LIMIT

  beforeEach(() => {
    process.env.CHAT_DAILY_MESSAGE_LIMIT = '20'
  })

  afterEach(() => {
    if (prev === undefined) delete process.env.CHAT_DAILY_MESSAGE_LIMIT
    else process.env.CHAT_DAILY_MESSAGE_LIMIT = prev
    vi.mocked(getServiceRoleClient).mockReset()
    vi.mocked(getServiceRoleClient).mockImplementation(() =>
      createMockSupabaseClient({
        rpc: async () => ({ data: true, error: null }),
      })
    )
  })

  it('allows when under the cap', async () => {
    mockUserQuotaRow({
      daily_msg_count: 19,
      msg_reset_at: new Date().toISOString(),
      is_byok: false,
      is_premium: false,
    })
    expect((await assertDailyChatQuota('user-1')).ok).toBe(true)
  })

  it('allows BYOK users', async () => {
    mockUserQuotaRow({
      daily_msg_count: 99,
      msg_reset_at: new Date().toISOString(),
      is_byok: true,
      is_premium: false,
    })
    expect((await assertDailyChatQuota('user-1')).ok).toBe(true)
  })

  it('returns 429 when at the cap', async () => {
    mockUserQuotaRow({
      daily_msg_count: 20,
      msg_reset_at: new Date().toISOString(),
      is_byok: false,
      is_premium: false,
    })
    const result = await assertDailyChatQuota('user-1')
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.response.status).toBe(429)
    const body = await result.response.json()
    expect(body.code).toBe('quota_exceeded')
    expect(body.limit).toBe(20)
    expect(body.upgradeUrl).toBe('/settings')
  })

  it('returns 503 when quota fetch fails', async () => {
    vi.mocked(getServiceRoleClient).mockImplementation(() =>
      createMockSupabaseClient({
        from: () =>
          createQueryChain(async () => ({
            data: null,
            error: { message: 'db down' },
          })),
      })
    )
    const result = await assertDailyChatQuota('user-1')
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.response.status).toBe(503)
  })
})
