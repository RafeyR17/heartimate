import { describe, expect, it } from 'vitest'
import {
  authUrlHasCredentialQuery,
  stripCredentialQueryFromUrl,
} from '@/lib/auth-query-strip'

describe('auth-query-strip', () => {
  it('detects credential query params', () => {
    expect(authUrlHasCredentialQuery(new URLSearchParams('email=a@b.c'))).toBe(true)
    expect(authUrlHasCredentialQuery(new URLSearchParams('password=secret'))).toBe(true)
    expect(authUrlHasCredentialQuery(new URLSearchParams('redirect_url=/home'))).toBe(
      false
    )
  })

  it('strips email and password while keeping other params', () => {
    const dirty = new URL(
      'http://localhost:3000/login?email=a%40b.c&password=x&redirect_url=%2Fhome'
    )
    const clean = stripCredentialQueryFromUrl(dirty)
    expect(clean?.pathname).toBe('/login')
    expect(clean?.search).toBe('?redirect_url=%2Fhome')
  })

  it('returns null when URL is already clean', () => {
    const url = new URL('http://localhost:3000/signup')
    expect(stripCredentialQueryFromUrl(url)).toBeNull()
  })
})
