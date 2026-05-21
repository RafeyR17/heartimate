import { beforeEach, describe, expect, it, vi } from 'vitest'
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

import { GET, PATCH } from './route'

describe('GET /api/users/me', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when unauthenticated', async () => {
    createAuthedDb.mockResolvedValue(null)
    const res = await GET(new Request('http://localhost/api/users/me'))
    expect((await readJsonResponse(res)).status).toBe(401)
  })

  it('returns current user', async () => {
    const supabase = createMockSupabaseClient({
      from: () =>
        createQueryChain(async () => ({
          data: {
            id: 'user-1',
            clerk_id: 'clerk-1',
            display_name: 'Ada',
            bio: null,
            avatar_url: null,
            is_premium: false,
            created_at: '2024-01-01',
          },
          error: null,
        })),
    })
    createAuthedDb.mockResolvedValue(mockAuthedDb({ supabase, user: { id: 'user-1', display_name: 'Ada' } }))
    const res = await GET(new Request('http://localhost/api/users/me'))
    const { status, json } = await readJsonResponse(res)
    expect(status).toBe(200)
    expect(json.success).toBe(true)
    expect((json.user as { display_name: string }).display_name).toBe('Ada')
  })
})

describe('PATCH /api/users/me', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when unauthenticated', async () => {
    createAuthedDb.mockResolvedValue(null)
    const res = await PATCH(
      jsonRequest('http://localhost/api/users/me', { displayName: 'New' })
    )
    expect((await readJsonResponse(res)).status).toBe(401)
  })
})
