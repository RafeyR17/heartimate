import { describe, expect, it } from 'vitest'
import { buildContentSecurityPolicy } from '@/lib/security-headers'

describe('buildContentSecurityPolicy', () => {
  it('allows inline scripts for Next.js and Clerk', () => {
    const csp = buildContentSecurityPolicy()
    expect(csp).toContain("'unsafe-inline'")
    expect(csp).toContain('https://*.clerk.accounts.dev')
    expect(csp).toContain('https://clerk-telemetry.com')
    expect(csp).toContain('https://image.pollinations.ai')
  })
})
