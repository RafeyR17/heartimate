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

describe('POST /api/chats', () => {
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
      jsonRequest('http://localhost/api/chats', { characterId: 'char-1' })
    )
    expect((await readJsonResponse(res)).status).toBe(401)
  })

  it('returns existing chat when one already exists', async () => {
    const supabase = createMockSupabaseClient({
      from: (table) => {
        if (table === 'personas') {
          return createQueryChain(async () => ({ data: null, error: null, count: 1 }))
        }
        if (table === 'chats') {
          return createQueryChain(async () => ({
            data: { id: 'chat-existing', persona_id: null },
            error: null,
          }))
        }
        return createQueryChain(async () => ({ data: null, error: null }))
      },
    })
    createAuthedDb.mockResolvedValue(mockAuthedDb({ supabase }))

    const res = await POST(
      jsonRequest('http://localhost/api/chats', {
        characterId: 'char-1',
        skipDefaultPersona: true,
      })
    )
    const { status, json } = await readJsonResponse(res)
    expect(status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.chatId).toBe('chat-existing')
  })
})
