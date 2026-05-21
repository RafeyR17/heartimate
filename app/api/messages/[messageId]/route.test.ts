import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getServiceRoleClient } from '@/lib/service-role'
import { createMockSupabaseClient } from '@/lib/test/mock-supabase'
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

describe('PATCH /api/messages/[messageId]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 429 when rate limited', async () => {
    vi.mocked(getServiceRoleClient).mockReturnValueOnce(
      createMockSupabaseClient({
        rpc: async (fn) =>
          fn === 'try_acquire_api_rate_slot'
            ? { data: false, error: null }
            : { data: true, error: null },
      })
    )
    createAuthedDb.mockResolvedValue(
      mockAuthedDb({ supabase: createMockSupabaseClient({}) })
    )

    const res = await PATCH(
      jsonRequest('http://localhost/api/messages/msg-1', {
        content: 'edited',
      }),
      { params: Promise.resolve({ messageId: 'msg-1' }) }
    )
    expect((await readJsonResponse(res)).status).toBe(429)
  })

  it('returns 401 when unauthenticated', async () => {
    createAuthedDb.mockResolvedValue(null)
    const res = await PATCH(
      jsonRequest('http://localhost/api/messages/msg-1', {
        content: 'edited',
      }),
      { params: Promise.resolve({ messageId: 'msg-1' }) }
    )
    expect((await readJsonResponse(res)).status).toBe(401)
  })

  it('returns 404 with MESSAGE_NOT_FOUND when RPC reports not_found', async () => {
    const supabase = createMockSupabaseClient({
      rpc: async (fn) =>
        fn === 'patch_user_message'
          ? { data: { ok: false, error: 'not_found' }, error: null }
          : { data: true, error: null },
    })
    createAuthedDb.mockResolvedValue(mockAuthedDb({ supabase }))

    const res = await PATCH(
      jsonRequest('http://localhost/api/messages/missing', {
        content: 'edited text',
      }),
      { params: Promise.resolve({ messageId: 'missing' }) }
    )
    const { status, json } = await readJsonResponse(res)
    expect(status).toBe(404)
    expect(json.error).toBe('Message not found')
    expect(json.code).toBe('MESSAGE_NOT_FOUND')
  })

  it('returns 403 when RPC reports forbidden', async () => {
    const supabase = createMockSupabaseClient({
      rpc: async (fn) =>
        fn === 'patch_user_message'
          ? { data: { ok: false, error: 'forbidden' }, error: null }
          : { data: true, error: null },
    })
    createAuthedDb.mockResolvedValue(mockAuthedDb({ supabase }))

    const res = await PATCH(
      jsonRequest('http://localhost/api/messages/msg-1', {
        content: 'edited text',
      }),
      { params: Promise.resolve({ messageId: 'msg-1' }) }
    )
    const { status, json } = await readJsonResponse(res)
    expect(status).toBe(403)
    expect(json.error).toBe('Forbidden')
  })

  it('returns 400 when RPC reports non-user message', async () => {
    const supabase = createMockSupabaseClient({
      rpc: async (fn) =>
        fn === 'patch_user_message'
          ? { data: { ok: false, error: 'not_user_message' }, error: null }
          : { data: true, error: null },
    })
    createAuthedDb.mockResolvedValue(mockAuthedDb({ supabase }))

    const res = await PATCH(
      jsonRequest('http://localhost/api/messages/msg-1', {
        content: 'edited text',
      }),
      { params: Promise.resolve({ messageId: 'msg-1' }) }
    )
    const { status, json } = await readJsonResponse(res)
    expect(status).toBe(400)
    expect(json.error).toMatch(/Only user messages/)
  })

  it('updates owned user message via RPC', async () => {
    const supabase = createMockSupabaseClient({
      rpc: async (fn) =>
        fn === 'patch_user_message'
          ? {
              data: {
                ok: true,
                message: {
                  id: 'msg-1',
                  role: 'user',
                  content: 'edited text',
                  created_at: new Date().toISOString(),
                },
              },
              error: null,
            }
          : { data: true, error: null },
    })
    createAuthedDb.mockResolvedValue(mockAuthedDb({ supabase }))

    const res = await PATCH(
      jsonRequest('http://localhost/api/messages/msg-1', {
        content: 'edited text',
        truncateAfter: true,
      }),
      { params: Promise.resolve({ messageId: 'msg-1' }) }
    )
    const { status, json } = await readJsonResponse(res)
    expect(status).toBe(200)
    expect(json.success).toBe(true)
    expect((json.message as { content: string }).content).toBe('edited text')
  })
})

describe('DELETE /api/messages/[messageId]', () => {
  it('returns 404 when RPC reports not_found', async () => {
    const supabase = createMockSupabaseClient({
      rpc: async (fn) =>
        fn === 'delete_owned_message'
          ? { data: { ok: false, error: 'not_found' }, error: null }
          : { data: true, error: null },
    })
    createAuthedDb.mockResolvedValue(mockAuthedDb({ supabase }))

    const res = await DELETE(
      new Request('http://localhost/api/messages/missing'),
      { params: Promise.resolve({ messageId: 'missing' }) }
    )
    expect((await readJsonResponse(res)).status).toBe(404)
  })

  it('deletes owned message via RPC', async () => {
    const supabase = createMockSupabaseClient({
      rpc: async (fn) =>
        fn === 'delete_owned_message'
          ? { data: { ok: true, deleted: true }, error: null }
          : { data: true, error: null },
    })
    createAuthedDb.mockResolvedValue(mockAuthedDb({ supabase }))

    const res = await DELETE(
      new Request('http://localhost/api/messages/msg-1', { method: 'DELETE' }),
      { params: Promise.resolve({ messageId: 'msg-1' }) }
    )
    const { status, json } = await readJsonResponse(res)
    expect(status).toBe(200)
    expect(json.deleted).toBe(true)
  })
})
