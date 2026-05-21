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

import { PATCH, DELETE } from './route'

describe('PATCH /api/chats/:chatId', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when unauthenticated', async () => {
    createAuthedDb.mockResolvedValue(null)
    const res = await PATCH(
      jsonRequest('http://localhost/api/chats/c1', { title: 'New title' }),
      { params: Promise.resolve({ chatId: 'c1' }) }
    )
    expect((await readJsonResponse(res)).status).toBe(401)
  })

  it('returns 404 when chat not found', async () => {
    const supabase = createMockSupabaseClient({
      from: () => createQueryChain(async () => ({ data: null, error: null })),
    })
    createAuthedDb.mockResolvedValue(mockAuthedDb({ supabase }))
    const res = await PATCH(
      jsonRequest('http://localhost/api/chats/c1', { title: 'New title' }),
      { params: Promise.resolve({ chatId: 'c1' }) }
    )
    expect((await readJsonResponse(res)).status).toBe(404)
  })
})

describe('DELETE /api/chats/:chatId', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 404 when chat missing', async () => {
    const supabase = createMockSupabaseClient({
      from: () => createQueryChain(async () => ({ data: null, error: null })),
    })
    createAuthedDb.mockResolvedValue(mockAuthedDb({ supabase }))
    const res = await DELETE(new Request('http://localhost/api/chats/c1'), {
      params: Promise.resolve({ chatId: 'c1' }),
    })
    expect((await readJsonResponse(res)).status).toBe(404)
  })
})
