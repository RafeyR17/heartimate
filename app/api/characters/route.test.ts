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

describe('POST /api/characters', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when unauthenticated', async () => {
    createAuthedDb.mockResolvedValue(null)
    const form = new FormData()
    form.set('name', 'Test')
    const res = await POST(
      new Request('http://localhost/api/characters', { method: 'POST', body: form })
    )
    expect((await readJsonResponse(res)).status).toBe(401)
  })

  it('rejects missing name', async () => {
    createAuthedDb.mockResolvedValue(mockAuthedDb())
    const form = new FormData()
    const res = await POST(
      new Request('http://localhost/api/characters', { method: 'POST', body: form })
    )
    const { status, json } = await readJsonResponse(res)
    expect(status).toBe(400)
    expect(json.success).toBe(false)
  })
})
