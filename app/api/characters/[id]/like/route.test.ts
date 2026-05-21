import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getServiceRoleClient } from '@/lib/service-role'
import { createMockSupabaseClient, createQueryChain } from '@/lib/test/mock-supabase'
import { mockAuthedDb } from '@/lib/test/mock-authed-db'
import { readJsonResponse } from '@/lib/test/route-helpers'

const { createAuthedDb } = vi.hoisted(() => ({
  createAuthedDb: vi.fn(),
}))

vi.mock('@/lib/authed-db', () => ({
  createAuthedDb,
  createAuthedAdminDb: createAuthedDb,
}))

import { POST } from './route'

describe('POST /api/characters/[id]/like', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
    createAuthedDb.mockResolvedValue(
      mockAuthedDb({ supabase: createMockSupabaseClient({}) })
    )

    const res = await POST(new Request('http://localhost/api/characters/c1/like'), {
      params: Promise.resolve({ id: 'c1' }),
    })
    expect((await readJsonResponse(res)).status).toBe(429)
  })

  it('toggles like off when already liked', async () => {
    const supabase = createMockSupabaseClient({
      from: (table) => {
        if (table === 'characters') {
          return createQueryChain(async () => ({
            data: { id: 'c1', user_id: 'other', is_public: true, likes_count: 4 },
            error: null,
          }))
        }
        if (table === 'character_likes') {
          let calls = 0
          const chain = createQueryChain(async () => {
            calls += 1
            if (calls === 1) {
              return { data: { id: 'like-1' }, error: null }
            }
            return { data: null, error: null }
          })
          return chain
        }
        return createQueryChain(async () => ({ data: null, error: null }))
      },
    })
    createAuthedDb.mockResolvedValue(mockAuthedDb({ supabase }))

    const res = await POST(new Request('http://localhost/api/characters/c1/like'), {
      params: Promise.resolve({ id: 'c1' }),
    })
    const { status, json } = await readJsonResponse(res)
    expect(status).toBe(200)
    expect(json.liked).toBe(false)
    expect(json.likesCount).toBe(4)
  })
})
