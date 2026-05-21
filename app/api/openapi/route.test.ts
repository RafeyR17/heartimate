import { describe, expect, it } from 'vitest'
import { GET } from './route'

describe('GET /api/openapi', () => {
  it('returns OpenAPI spec envelope', async () => {
    const res = await GET(new Request('http://localhost/api/openapi'))
    const { status, json } = await (async () => {
      const body = (await res.json()) as Record<string, unknown>
      return { status: res.status, json: body }
    })()
    expect(status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.spec).toBeTruthy()
    expect(res.headers.get('x-request-id')).toBeTruthy()
  })
})
