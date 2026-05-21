import { describe, expect, it } from 'vitest'
import { apiError, resolveApiErrorCode } from '@/lib/api'
import { API_ERROR_CODES } from '@/lib/api-error-codes'

describe('resolveApiErrorCode', () => {
  it('maps HTTP status to default codes', () => {
    expect(resolveApiErrorCode(401)).toBe(API_ERROR_CODES.UNAUTHORIZED)
    expect(resolveApiErrorCode(404)).toBe(API_ERROR_CODES.NOT_FOUND)
    expect(resolveApiErrorCode(429)).toBe(API_ERROR_CODES.RATE_LIMITED)
    expect(resolveApiErrorCode(500)).toBe(API_ERROR_CODES.INTERNAL_ERROR)
  })

  it('prefers explicit code override', () => {
    expect(resolveApiErrorCode(404, API_ERROR_CODES.MESSAGE_NOT_FOUND)).toBe(
      API_ERROR_CODES.MESSAGE_NOT_FOUND
    )
  })
})

describe('apiError', () => {
  it('always includes code in JSON body', async () => {
    const res = apiError('Chat not found', 404, {
      code: API_ERROR_CODES.CHAT_NOT_FOUND,
    })
    const json = await res.json()
    expect(json.code).toBe('CHAT_NOT_FOUND')
    expect(json.error).toBe('Chat not found')
    expect(json).not.toHaveProperty('stack')
  })

  it('defaults code from status when omitted', async () => {
    const res = apiError('Too many requests', 429)
    const json = await res.json()
    expect(json.code).toBe('RATE_LIMITED')
  })
})
