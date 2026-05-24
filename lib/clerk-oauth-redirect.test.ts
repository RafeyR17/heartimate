import { describe, expect, it } from 'vitest'
import { getClerkOAuthRedirectUrls } from '@/lib/clerk-oauth-redirect'

describe('getClerkOAuthRedirectUrls', () => {
  it('builds absolute callback URLs from env', () => {
    const urls = getClerkOAuthRedirectUrls('/home')
    expect(urls.redirectUrl).toMatch(/\/sso-callback$/)
    expect(urls.redirectUrlComplete).toMatch(/\/home$/)
    expect(urls.redirectUrl).toMatch(/^https?:\/\//)
  })
})
