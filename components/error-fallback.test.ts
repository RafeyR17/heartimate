import { describe, expect, it, vi } from 'vitest'
import { shouldShowErrorDigest } from '@/components/ErrorFallback'

vi.mock('@/lib/posthog-browser', () => ({
  captureClientException: vi.fn(),
}))

describe('shouldShowErrorDigest', () => {
  it('shows digest when explicitly enabled', () => {
    expect(shouldShowErrorDigest(true)).toBe(true)
  })

  it('hides digest when explicitly disabled', () => {
    expect(shouldShowErrorDigest(false)).toBe(false)
  })
})
