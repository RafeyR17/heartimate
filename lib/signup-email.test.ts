import { describe, expect, it } from 'vitest'
import { isDisposableEmailDomain, validateSignupEmail } from './signup-email'

describe('validateSignupEmail', () => {
  it('accepts normal providers', () => {
    expect(validateSignupEmail('user@gmail.com')).toEqual({
      ok: true,
      normalized: 'user@gmail.com',
    })
  })

  it('rejects disposable domains', () => {
    const result = validateSignupEmail('bot@mailinator.com')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.message).toMatch(/disposable/i)
    }
  })

  it('rejects subdomain of disposable provider', () => {
    expect(isDisposableEmailDomain('foo.mailinator.com')).toBe(true)
  })

  it('rejects invalid format', () => {
    expect(validateSignupEmail('not-an-email').ok).toBe(false)
  })
})
