import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getServiceRoleClient } from '@/lib/service-role'
import { createMockSupabaseClient, createQueryChain } from '@/lib/test/mock-supabase'
import { mockAuthedDb } from '@/lib/test/mock-authed-db'
import { jsonRequest, readJsonResponse } from '@/lib/test/route-helpers'

const { createAuthedDb } = vi.hoisted(() => ({
  createAuthedDb: vi.fn(),
}))

vi.mock('@/lib/authed-db', () => ({
  createAuthedDb,
  createAuthedAdminDb: createAuthedDb,
}))

vi.mock('@/lib/posthog-server', () => ({
  getPostHogClient: () => ({ capture: vi.fn(), shutdown: vi.fn() }),
}))

import { POST } from './route'

describe('POST /api/reports', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getServiceRoleClient).mockImplementation(() =>
      createMockSupabaseClient({
        rpc: async () => ({ data: true, error: null }),
      })
    )
  })

  it('returns 401 when unauthenticated', async () => {
    createAuthedDb.mockResolvedValue(null)
    const res = await POST(
      jsonRequest('http://localhost/api/reports', {
        characterId: 'char-1',
        reason: 'Spam / Low quality',
      })
    )
    expect((await readJsonResponse(res)).status).toBe(401)
  })

  it('returns 429 when rate limited', async () => {
    vi.mocked(getServiceRoleClient).mockReturnValueOnce(
      createMockSupabaseClient({
        rpc: async (fn) =>
          fn === 'try_acquire_api_rate_slot'
            ? { data: false, error: null }
            : { data: null, error: null },
      })
    )
    createAuthedDb.mockResolvedValue(mockAuthedDb({ supabase: createMockSupabaseClient({}) }))

    const res = await POST(
      jsonRequest('http://localhost/api/reports', {
        characterId: 'char-1',
        reason: 'Spam / Low quality',
      })
    )
    const { status } = await readJsonResponse(res)
    expect(status).toBe(429)
  })

  it('submits report when allowed', async () => {
    const supabase = createMockSupabaseClient({
      from: (table) => {
        if (table === 'characters') {
          return createQueryChain(async () => ({
            data: { id: 'char-1', user_id: 'other', is_public: true },
            error: null,
          }))
        }
        if (table === 'reports') {
          return createQueryChain(async () => ({ data: null, error: null }))
        }
        return createQueryChain(async () => ({ data: null, error: null }))
      },
    })
    createAuthedDb.mockResolvedValue(mockAuthedDb({ supabase }))

    const res = await POST(
      jsonRequest('http://localhost/api/reports', {
        characterId: 'char-1',
        reason: 'Harassment',
      })
    )
    const { status, json } = await readJsonResponse(res)
    expect(status).toBe(200)
    expect(json.success).toBe(true)
  })
})
