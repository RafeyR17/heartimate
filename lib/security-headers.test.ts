import { describe, expect, it, vi, afterEach } from 'vitest'
import { getSecurityHeaders } from '@/lib/security-headers'

describe('getSecurityHeaders', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('includes CSP and anti-clickjacking headers', () => {
    const headers = getSecurityHeaders()
    const map = Object.fromEntries(headers.map((h) => [h.key, h.value]))

    expect(map['Content-Security-Policy']).toContain("default-src 'self'")
    expect(map['Content-Security-Policy']).toContain("frame-ancestors 'none'")
    expect(map['Content-Security-Policy']).toContain("connect-src 'self'")
    expect(map['X-Frame-Options']).toBe('DENY')
    expect(map['Referrer-Policy']).toBe('strict-origin-when-cross-origin')
    expect(map['X-Content-Type-Options']).toBe('nosniff')
    expect(map['Permissions-Policy']).toContain('camera=()')
  })

  it('adds HSTS in production only', () => {
    vi.stubEnv('NODE_ENV', 'development')
    expect(getSecurityHeaders().some((h) => h.key === 'Strict-Transport-Security')).toBe(
      false
    )

    vi.stubEnv('NODE_ENV', 'production')
    const hsts = getSecurityHeaders().find((h) => h.key === 'Strict-Transport-Security')
    expect(hsts?.value).toContain('max-age=31536000')
  })
})
