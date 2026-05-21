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

import { GET, DELETE } from './route'

describe('GET /api/personas/:id', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when unauthenticated', async () => {
    createAuthedDb.mockResolvedValue(null)
    const res = await GET(new Request('http://localhost/api/personas/p1'), {
      params: Promise.resolve({ id: 'p1' }),
    })
    expect((await readJsonResponse(res)).status).toBe(401)
  })

  it('returns 404 when persona not owned', async () => {
    const supabase = createMockSupabaseClient({
      from: () => createQueryChain(async () => ({ data: null, error: null })),
    })
    createAuthedDb.mockResolvedValue(mockAuthedDb({ supabase }))
    const res = await GET(new Request('http://localhost/api/personas/p1'), {
      params: Promise.resolve({ id: 'p1' }),
    })
    expect((await readJsonResponse(res)).status).toBe(404)
  })

  it('returns persona when found', async () => {
    const supabase = createMockSupabaseClient({
      from: () =>
        createQueryChain(async () => ({
          data: { id: 'p1', name: 'Work', user_id: 'user-1' },
          error: null,
        })),
    })
    createAuthedDb.mockResolvedValue(mockAuthedDb({ supabase }))
    const res = await GET(new Request('http://localhost/api/personas/p1'), {
      params: Promise.resolve({ id: 'p1' }),
    })
    const { status, json } = await readJsonResponse(res)
    expect(status).toBe(200)
    expect(json.success).toBe(true)
    expect((json.persona as { name: string }).name).toBe('Work')
  })
})

describe('DELETE /api/personas/:id', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 404 when persona missing', async () => {
    const supabase = createMockSupabaseClient({
      from: () => createQueryChain(async () => ({ data: null, error: null })),
    })
    createAuthedDb.mockResolvedValue(mockAuthedDb({ supabase }))
    const res = await DELETE(new Request('http://localhost/api/personas/p1'), {
      params: Promise.resolve({ id: 'p1' }),
    })
    expect((await readJsonResponse(res)).status).toBe(404)
  })
})
