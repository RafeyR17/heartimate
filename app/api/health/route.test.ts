import { describe, expect, it } from 'vitest'
import { GET } from './route'

describe('GET /api/health', () => {
  it('returns ok with request id', async () => {
    const res = await GET(new Request('http://localhost/api/health'))
    expect(res.status).toBe(200)
    expect(res.headers.get('x-request-id')).toBeTruthy()
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.status).toBe('ok')
    expect(body.timestamp).toBeTruthy()
  })
})
