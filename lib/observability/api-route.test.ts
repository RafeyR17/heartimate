import { describe, expect, it } from 'vitest'
import { apiSuccess } from '@/lib/api'
import { REQUEST_ID_HEADER } from '@/lib/observability/constants'
import { runApiHandler } from '@/lib/observability/api-route'

describe('runApiHandler', () => {
  it('returns x-request-id on success', async () => {
    const res = await runApiHandler('GET /api/test', new Request('http://localhost/api/test'), async () =>
      apiSuccess({ ok: true })
    )
    expect(res.status).toBe(200)
    expect(res.headers.get(REQUEST_ID_HEADER)).toBeTruthy()
  })

  it('preserves client request id', async () => {
    const res = await runApiHandler(
      'GET /api/test',
      new Request('http://localhost/api/test', {
        headers: { [REQUEST_ID_HEADER]: 'client-req-12345678' },
      }),
      async () => apiSuccess({})
    )
    expect(res.headers.get(REQUEST_ID_HEADER)).toBe('client-req-12345678')
  })
})
