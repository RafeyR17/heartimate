/** Client-safe onboarding starter types (no server-only imports). */

export type OnboardingStarter = {
  id: string
  name: string
  tag: string
  img: string
  teaser: string
  msg: string
  description?: string
  tags?: string[]
}

export const ONBOARDING_STARTER_FALLBACK_IMG = '/images/characters/lyra.jpg'
