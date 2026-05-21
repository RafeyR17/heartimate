import { describe, expect, it } from 'vitest'
import { parseChatStreamMeta } from '@/lib/api-contract'

describe('parseChatStreamMeta', () => {
  it('parses chat stream headers', () => {
    const headers = new Headers({
      'x-request-id': 'abc-12345678',
      'X-Special-Reply': 'true',
      'X-Level-Up': 'false',
      'X-Relationship-Level': 'friend',
      'X-Relationship-Label': 'Friend',
      'X-Relationship-Color': '#fff',
      'X-Relationship-Progress': '42',
      'X-Relationship-Score': '10',
      'X-Relationship-Next': '20',
    })
    const meta = parseChatStreamMeta(headers)
    expect(meta.requestId).toBe('abc-12345678')
    expect(meta.specialReply).toBe(true)
    expect(meta.relationshipScore).toBe(10)
  })
})
