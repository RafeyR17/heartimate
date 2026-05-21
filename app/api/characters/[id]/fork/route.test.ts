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

describe('POST /api/characters/:id/fork', () => {
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
    const res = await POST(new Request('http://localhost/api/characters/c1/fork', { method: 'POST' }), {
      params: Promise.resolve({ id: 'c1' }),
    })
    expect((await readJsonResponse(res)).status).toBe(401)
  })

  it('returns 404 when source character is missing', async () => {
    const supabase = createMockSupabaseClient({
      from: () =>
        createQueryChain(async () => ({ data: null, error: { message: 'not found' } })),
    })
    createAuthedDb.mockResolvedValue(mockAuthedDb({ supabase }))

    const res = await POST(new Request('http://localhost/api/characters/c1/fork', { method: 'POST' }), {
      params: Promise.resolve({ id: 'c1' }),
    })
    expect((await readJsonResponse(res)).status).toBe(404)
  })
})
