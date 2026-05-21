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
    vi.mocked(getServiceRoleClient).mockImplementation(() =>
      createMockSupabaseClient({
        from: (table) => {
          if (table !== 'chat_rate_events') {
            return createQueryChain(async () => ({ data: null, error: null }))
          }
          return createQueryChain(async () => ({ data: null, error: null, count: 19 }))
        },
      })
    )
    expect(await assertDailyChatQuota('user-1')).toBeNull()
  })

  it('returns 429 when at the cap', async () => {
    vi.mocked(getServiceRoleClient).mockImplementation(() =>
      createMockSupabaseClient({
        from: (table) => {
          if (table !== 'chat_rate_events') {
            return createQueryChain(async () => ({ data: null, error: null }))
          }
          return createQueryChain(async () => ({ data: null, error: null, count: 20 }))
        },
      })
    )
    const res = await assertDailyChatQuota('user-1')
    expect(res?.status).toBe(429)
    const body = await res!.json()
    expect(body.code).toBe('daily_chat_limit')
    expect(body.limit).toBe(20)
  })

  it('returns 503 when count fails', async () => {
    vi.mocked(getServiceRoleClient).mockImplementation(() =>
      createMockSupabaseClient({
        from: () =>
          createQueryChain(async () => ({
            data: null,
            error: { message: 'db down' },
            count: null,
          })),
      })
    )
    const res = await assertDailyChatQuota('user-1')
    expect(res?.status).toBe(503)
  })
})
