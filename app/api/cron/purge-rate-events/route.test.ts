import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getServiceRoleClient } from '@/lib/service-role'
import { createMockSupabaseClient } from '@/lib/test/mock-supabase'
import { readJsonResponse } from '@/lib/test/route-helpers'

import { GET } from './route'

describe('GET /api/cron/purge-rate-events', () => {
  const prevSecret = process.env.CRON_SECRET

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.CRON_SECRET = 'test-cron-secret'
    vi.mocked(getServiceRoleClient).mockImplementation(() =>
      createMockSupabaseClient({
        rpc: async () => ({ data: { ok: true }, error: null }),
      })
    )
  })

  afterEach(() => {
    process.env.CRON_SECRET = prevSecret
  })

  it('returns 401 without bearer token', async () => {
    const res = await GET(new Request('http://localhost/api/cron/purge-rate-events'))
    expect((await readJsonResponse(res)).status).toBe(401)
  })

  it('purges ledgers when authorized', async () => {
    const res = await GET(
      new Request('http://localhost/api/cron/purge-rate-events', {
        headers: { authorization: 'Bearer test-cron-secret' },
      })
    )
    const { status, json } = await readJsonResponse(res)
    expect(status).toBe(200)
    expect(json.success).toBe(true)
  })
})
