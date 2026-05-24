import { describe, expect, it } from 'vitest'
import { mapClerkError } from '@/lib/auth-errors'

describe('mapClerkError', () => {
  it('maps known clerk error codes', () => {
    expect(
      mapClerkError({
        errors: [{ code: 'form_password_incorrect', message: 'x' }],
      })
    ).toContain('Incorrect password')
  })

  it('maps captcha_missing_token', () => {
    expect(
      mapClerkError({
        errors: [{ code: 'captcha_missing_token' }],
      })
    ).toContain('Security check')
  })

  it('maps strategy_for_user_invalid', () => {
    expect(
      mapClerkError({
        errors: [{ code: 'strategy_for_user_invalid' }],
      })
    ).toContain('Google')
  })
})
