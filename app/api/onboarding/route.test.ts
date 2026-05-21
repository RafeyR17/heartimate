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

vi.mock('@/lib/supabase-server', () => ({
  createSupabaseAnonClient: vi.fn(() =>
    createMockSupabaseClient({
      from: () =>
        createQueryChain(async () => ({
          data: [
            { id: 'char-1', name: 'Lyra', greeting: 'Hi', avatar_url: null },
          ],
          error: null,
        })),
    })
  ),
}))

import { GET, POST } from './route'

describe('GET /api/onboarding', () => {
  it('returns public starter characters', async () => {
    const res = await GET(new Request('http://localhost/api/onboarding'))
    const { status, json } = await readJsonResponse(res)
    expect(status).toBe(200)
    expect(json.success).toBe(true)
    expect(Array.isArray(json.starters)).toBe(true)
    expect((json.starters as unknown[]).length).toBeGreaterThan(0)
  })
})

describe('POST /api/onboarding', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    createAuthedDb.mockResolvedValue(null)
    const res = await POST(
      jsonRequest('http://localhost/api/onboarding', {
        displayName: 'Ada',
        starterCharId: 'char-1',
      })
    )
    const { status } = await readJsonResponse(res)
    expect(status).toBe(401)
  })

  it('rejects invalid body', async () => {
    createAuthedDb.mockResolvedValue(mockAuthedDb())
    const res = await POST(
      jsonRequest('http://localhost/api/onboarding', {
        displayName: '',
        starterCharId: 'char-1',
        isAdult: true,
      })
    )
    const { status, json } = await readJsonResponse(res)
    expect(status).toBe(400)
    expect(json.success).toBe(false)
  })

  it('returns 400 when isAdult is false', async () => {
    createAuthedDb.mockResolvedValue(mockAuthedDb())
    const res = await POST(
      jsonRequest('http://localhost/api/onboarding', {
        displayName: 'Ada',
        starterCharId: 'char-1',
        isAdult: false,
      })
    )
    const { status, json } = await readJsonResponse(res)
    expect(status).toBe(400)
    expect(json.error).toMatch(/Must be 18 or older/)
  })

  it('returns 400 when isAdult is missing', async () => {
    createAuthedDb.mockResolvedValue(mockAuthedDb())
    const res = await POST(
      jsonRequest('http://localhost/api/onboarding', {
        displayName: 'Ada',
        starterCharId: 'char-1',
      })
    )
    const { status, json } = await readJsonResponse(res)
    expect(status).toBe(400)
    expect(json.success).toBe(false)
    expect(json.error).toBeTruthy()
  })

  it('returns 404 when starter is not public', async () => {
    const supabase = createMockSupabaseClient({
      from: (table) => {
        if (table === 'characters') {
          return createQueryChain(async () => ({ data: null, error: null }))
        }
        return createQueryChain(async () => ({ data: null, error: null }))
      },
    })
    createAuthedDb.mockResolvedValue(mockAuthedDb({ supabase }))

    const res = await POST(
      jsonRequest('http://localhost/api/onboarding', {
        displayName: 'Ada',
        starterCharId: 'char-private',
        isAdult: true,
      })
    )
    const { status, json } = await readJsonResponse(res)
    expect(status).toBe(404)
    expect(json.error).toMatch(/Starter character/)
  })

  it('creates chat for valid onboarding payload', async () => {
    const supabase = createMockSupabaseClient({
      from: (table) => {
        if (table === 'characters') {
          return createQueryChain(async () => ({
            data: {
              id: 'char-1',
              name: 'Lyra',
              greeting: 'Hello',
              is_public: true,
            },
            error: null,
          }))
        }
        if (table === 'users') {
          return createQueryChain(async () => ({
            data: { id: 'user-test-1' },
            error: null,
          }))
        }
        return createQueryChain(async () => ({ data: null, error: null }))
      },
      rpc: async () => ({
        data: { chat_id: 'chat-new-1' },
        error: null,
      }),
    })
    createAuthedDb.mockResolvedValue(mockAuthedDb({ supabase }))

    const res = await POST(
      jsonRequest('http://localhost/api/onboarding', {
        displayName: 'Ada',
        starterCharId: 'char-1',
        isAdult: true,
      })
    )
    const { status, json } = await readJsonResponse(res)
    expect(status).toBe(200)
    expect(json.chatId).toBe('chat-new-1')
  })
})
