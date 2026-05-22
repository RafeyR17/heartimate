import { describe, expect, it } from 'vitest'
import { createMockSupabaseClient, createQueryChain } from '@/lib/test/mock-supabase'

// Test helpers via dynamic import after mock
describe('fetchOnboardingStarters', () => {
  it('uses hooked reveal copy for seed Lyra', async () => {
    const { fetchOnboardingStarters } = await import('@/lib/onboarding-starters')
    const supabase = createMockSupabaseClient({
      from: () =>
        createQueryChain(async () => ({
          data: [
            {
              id: 'hm-seed-lyra',
              name: 'Lyra Ashveil',
              description: 'old',
              avatar_url: '/images/characters/lyra.jpg',
              tags: ['romance'],
              greeting: 'plain hello',
            },
          ],
          error: null,
        })),
    })

    const starters = await fetchOnboardingStarters(supabase, 3)
    expect(starters[0]?.msg).toContain('counted every night')
    expect(starters[0]?.msg).toContain('[name]')

    const { fetchOnboardingStarters: fetch2 } = await import('@/lib/onboarding-starters')
    const supabaseUuid = createMockSupabaseClient({
      from: () =>
        createQueryChain(async () => ({
          data: [
            {
              id: '00000000-0000-0000-0000-000000000099',
              name: 'Lyra Ashveil',
              description: 'old',
              avatar_url: null,
              tags: ['romance'],
              greeting: '*steps closer, moonlight on her lashes* Hello, [name].',
            },
          ],
          error: null,
        })),
    })
    const byName = await fetch2(supabaseUuid, 3)
    expect(byName[0]?.msg).toContain('counted every night')
    expect(starters[0]?.teaser).toContain('knows your name')
  })
})
