import { beforeEach, describe, expect, it, vi } from 'vitest'
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

import { GET } from './route'

describe('GET /api/personas', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when unauthenticated', async () => {
    createAuthedDb.mockResolvedValue(null)
    const res = await GET(new Request('http://localhost/api/personas'))
    expect((await readJsonResponse(res)).status).toBe(401)
  })

  it('lists personas for the current user', async () => {
    const supabase = createMockSupabaseClient({
      from: (table) => {
        if (table === 'personas') {
          return createQueryChain(async () => ({
            data: [{ id: 'p1', name: 'Work', user_id: 'user-test-1' }],
            error: null,
          }))
        }
        return createQueryChain(async () => ({ data: null, error: null }))
      },
    })
    createAuthedDb.mockResolvedValue(mockAuthedDb({ supabase }))

    const res = await GET(new Request('http://localhost/api/personas'))
    const { status, json } = await readJsonResponse(res)
    expect(status).toBe(200)
    expect(json.success).toBe(true)
    expect(Array.isArray(json.personas)).toBe(true)
  })
})
