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

import { POST } from './route'

describe('POST /api/streak', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when unauthenticated', async () => {
    createAuthedDb.mockResolvedValue(null)
    const res = await POST(new Request('http://localhost/api/streak', { method: 'POST' }))
    expect((await readJsonResponse(res)).status).toBe(401)
  })

  it('returns streak payload when update succeeds', async () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
    const supabase = createMockSupabaseClient({
      from: (table) => {
        if (table === 'users') {
          return createQueryChain(async () => ({
            data: {
              streak_count: 2,
              last_streak_date: yesterday,
              longest_streak: 2,
            },
            error: null,
          }))
        }
        return createQueryChain(async () => ({ data: null, error: null }))
      },
    })
    createAuthedDb.mockResolvedValue(mockAuthedDb({ supabase }))

    const res = await POST(new Request('http://localhost/api/streak', { method: 'POST' }))
    const { status, json } = await readJsonResponse(res)
    expect(status).toBe(200)
    expect(json.success).toBe(true)
    expect(typeof json.streak).toBe('number')
  })
})
