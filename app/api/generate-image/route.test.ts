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

import { POST } from './route'

describe('POST /api/generate-image', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when unauthenticated', async () => {
    createAuthedDb.mockResolvedValue(null)
    const res = await POST(
      new Request('http://localhost/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Lyra', tags: ['Romance'] }),
      })
    )
    expect((await readJsonResponse(res)).status).toBe(401)
  })

  it('returns pollinations URLs when authenticated', async () => {
    createAuthedDb.mockResolvedValue(mockAuthedDb())
    const res = await POST(
      new Request('http://localhost/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Lyra',
          description: 'A mysterious witch',
          tags: ['Dark Fantasy'],
          gender: 'Female',
          variationCount: 2,
        }),
      })
    )
    const { status, json } = await readJsonResponse(res)
    expect(status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.mainUrl).toContain('image.pollinations.ai')
    expect(json.variationUrls).toHaveLength(2)
    expect(json.prompt).toContain('dark fantasy aesthetic')
  })
})
