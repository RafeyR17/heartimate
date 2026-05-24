import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockAuthedDb } from '@/lib/test/mock-authed-db'
import { readJsonResponse } from '@/lib/test/route-helpers'

const { createAuthedDb } = vi.hoisted(() => ({
  createAuthedDb: vi.fn(),
}))

vi.mock('@/lib/authed-db', () => ({
  createAuthedDb,
  createAuthedAdminDb: createAuthedDb,
}))

vi.mock('@/lib/chat-daily-quota', () => ({
  assertDailyChatQuota: vi.fn(async () => ({
    ok: true,
    quota: { isByok: false, isPremium: false, allowed: true },
  })),
}))

vi.mock('@/lib/quota', () => ({
  incrementQuota: vi.fn(async () => undefined),
}))

import { POST } from './route'

describe('POST /api/chat/image', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when unauthenticated', async () => {
    createAuthedDb.mockResolvedValue(null)
    const res = await POST(
      new Request('http://localhost/api/chat/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: 'chat-1',
          characterId: 'char-1',
        }),
      })
    )
    expect((await readJsonResponse(res)).status).toBe(401)
  })

  it('returns preview URLs without persisting', async () => {
    const authed = mockAuthedDb()
    createAuthedDb.mockResolvedValue(authed)

    authed.supabase.from = vi.fn((table: string) => {
      if (table === 'chats') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { id: 'chat-1', character_id: 'char-1' },
                  error: null,
                }),
              }),
            }),
          }),
        }
      }
      if (table === 'characters') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  name: 'Seraph',
                  description: 'A witch',
                  personality: 'Warm',
                  tags: ['Romance'],
                },
                error: null,
              }),
            }),
          }),
        }
      }
      return { select: vi.fn() }
    }) as unknown as typeof authed.supabase.from

    const res = await POST(
      new Request('http://localhost/api/chat/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: 'chat-1',
          characterId: 'char-1',
          userRequest: 'moonlit selfie',
        }),
      })
    )
    const { status, json } = await readJsonResponse(res)
    expect(status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.imageUrls).toHaveLength(3)
    expect(json.prompt).toContain('moonlit selfie')
  })
})
