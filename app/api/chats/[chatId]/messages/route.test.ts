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

import { GET } from './route'

describe('GET /api/chats/:chatId/messages', () => {
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
    const res = await GET(new Request('http://localhost/api/chats/c1/messages'), {
      params: Promise.resolve({ chatId: 'c1' }),
    })
    expect((await readJsonResponse(res)).status).toBe(401)
  })

  it('returns 404 when chat is not owned', async () => {
    const supabase = createMockSupabaseClient({
      from: () =>
        createQueryChain(async () => ({ data: null, error: null })),
    })
    createAuthedDb.mockResolvedValue(mockAuthedDb({ supabase }))

    const res = await GET(new Request('http://localhost/api/chats/c1/messages'), {
      params: Promise.resolve({ chatId: 'c1' }),
    })
    expect((await readJsonResponse(res)).status).toBe(404)
  })

  it('returns paginated messages for owned chat', async () => {
    const supabase = createMockSupabaseClient({
      from: (table) => {
        if (table === 'chats') {
          return createQueryChain(async () => ({ data: { id: 'c1' }, error: null }))
        }
        if (table === 'messages') {
          return createQueryChain(async () => ({
            data: [
              {
                id: 'm1',
                role: 'assistant',
                content: 'Hi',
                created_at: '2024-01-02T00:00:00Z',
              },
            ],
            error: null,
          }))
        }
        return createQueryChain(async () => ({ data: null, error: null }))
      },
    })
    createAuthedDb.mockResolvedValue(mockAuthedDb({ supabase }))

    const res = await GET(new Request('http://localhost/api/chats/c1/messages'), {
      params: Promise.resolve({ chatId: 'c1' }),
    })
    const { status, json } = await readJsonResponse(res)
    expect(status).toBe(200)
    expect(json.success).toBe(true)
    expect(Array.isArray(json.messages)).toBe(true)
  })
})
