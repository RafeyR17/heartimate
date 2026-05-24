import { describe, expect, it, vi } from 'vitest'
import { GET, POST, DELETE } from './route'

const { createAuthedDb } = vi.hoisted(() => ({
  createAuthedDb: vi.fn(),
}))

vi.mock('@/lib/authed-db', () => ({
  createAuthedDb,
  createAuthedAdminDb: createAuthedDb,
}))

describe('GET /api/users/api-key', () => {
  it('returns 401 when unauthenticated', async () => {
    createAuthedDb.mockResolvedValue(null)
    const res = await GET(new Request('http://localhost/api/users/api-key'))
    expect(res.status).toBe(401)
  })
})

describe('POST /api/users/api-key', () => {
  it('returns 401 when unauthenticated', async () => {
    createAuthedDb.mockResolvedValue(null)
    const res = await POST(
      new Request('http://localhost/api/users/api-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: 'sk-or-test', provider: 'openrouter' }),
      })
    )
    expect(res.status).toBe(401)
  })
})

describe('DELETE /api/users/api-key', () => {
  it('returns 401 when unauthenticated', async () => {
    createAuthedDb.mockResolvedValue(null)
    const res = await DELETE(new Request('http://localhost/api/users/api-key'))
    expect(res.status).toBe(401)
  })
})
