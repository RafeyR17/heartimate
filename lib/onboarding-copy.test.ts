import { describe, expect, it } from 'vitest'
import { resolveOnboardingReveal, resolveOnboardingSeedKey } from '@/lib/onboarding-copy'

describe('onboarding-copy', () => {
  it('resolves by seed id', () => {
    expect(resolveOnboardingSeedKey('hm-seed-lyra', 'Lyra Ashveil')).toBe('hm-seed-lyra')
  })

  it('resolves by character name when id is a UUID', () => {
    expect(resolveOnboardingSeedKey('a1b2-c3d4', 'Lyra Ashveil')).toBe('hm-seed-lyra')
    const msg = resolveOnboardingReveal('uuid-lyra', 'Lyra Ashveil', 'old plain hello')
    expect(msg).toContain('counted every night')
    expect(msg).not.toContain('moonlight on her lashes')
  })
})
