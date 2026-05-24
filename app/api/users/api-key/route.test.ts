import { describe, expect, it, vi } from 'vitest'
import { createQueryChain } from '@/lib/test/mock-supabase'
import { mockAuthedDb } from '@/lib/test/mock-authed-db'
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
    const res = await DELETE(
      new Request('http://localhost/api/users/api-key', { method: 'DELETE' })
    )
    expect(res.status).toBe(401)
  })

  it('clears BYOK fields for the authed user', async () => {
    const usersUpdate = createQueryChain(async () => ({
      data: { id: 'user-test-1' },
      error: null,
    }))
    createAuthedDb.mockResolvedValue(
      mockAuthedDb({
        supabase: {
          from: (table: string) => {
            if (table === 'users') return usersUpdate
            return createQueryChain(async () => ({ data: null, error: null }))
          },
          rpc: vi.fn(async () => ({ data: true, error: null })),
        } as never,
      })
    )

    const res = await DELETE(
      new Request('http://localhost/api/users/api-key', { method: 'DELETE' })
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as { success: boolean; message?: string }
    expect(body.success).toBe(true)
    expect(usersUpdate.update).toHaveBeenCalled()
  })
})
