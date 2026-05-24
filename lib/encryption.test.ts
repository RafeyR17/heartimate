import { afterEach, describe, expect, it, vi } from 'vitest'
import { decryptKey, encryptKey } from '@/lib/encryption'

describe('encryption', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('round-trips API keys', () => {
    vi.stubEnv('ENCRYPTION_SECRET', 'test-secret-at-least-16-chars')
    const plain = 'sk-or-v1-test-key-12345'
    const enc = encryptKey(plain)
    expect(enc).not.toContain(plain)
    expect(decryptKey(enc)).toBe(plain)
  })
})
