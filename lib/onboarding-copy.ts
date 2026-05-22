/** Onboarding carousel + reveal copy. Works even when character rows use non-seed IDs. */

export type OnboardingSeedKey =
  | 'hm-seed-lyra'
  | 'hm-seed-kai'
  | 'hm-seed-aria'
  | 'hm-seed-seraph'

export const ONBOARDING_REVEAL_MSG: Record<OnboardingSeedKey, string> = {
  'hm-seed-lyra': `*The rooftop garden goes still when you step into the light—except her breath, close enough to warm your skin.*

"I counted every night you'd find me, [name]." *Her voice drops to a confession.* "Don't make me wait again."`,
  'hm-seed-kai': `*Neon rain slides down his jacket; he doesn't blink when he sees you.*

"[name]." *A slow grin.* "Wrong alley—or exactly the right one. You tell me."`,
  'hm-seed-aria': `*She's been holding the same cup, untouched—like she forgot the world the moment she sensed you.*

"...[name]?" *A breath she didn't know she was holding.* "I wasn't sure you'd actually come."`,
  'hm-seed-seraph': `*Candlelight catches gold in their eyes; the book closes without a sound.*

"So you're [name]." *A pause that feels like a choice.* "I've read about people like you. None of them stayed."`,
}

export const ONBOARDING_TEASER: Record<OnboardingSeedKey, string> = {
  'hm-seed-lyra': 'She already knows your name—and what you want before you say it.',
  'hm-seed-kai': 'Tonight gets dangerous the second you let him lead.',
  'hm-seed-aria': 'Shy until you choose her. Then impossible to forget.',
  'hm-seed-seraph': 'Elegant, unreadable, and far too interested in you.',
}

const SEED_KEYS: OnboardingSeedKey[] = [
  'hm-seed-lyra',
  'hm-seed-kai',
  'hm-seed-aria',
  'hm-seed-seraph',
]

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/** Map seed id or display name to canonical onboarding copy key. */
export function resolveOnboardingSeedKey(
  characterId: string,
  characterName: string
): OnboardingSeedKey | null {
  if (SEED_KEYS.includes(characterId as OnboardingSeedKey)) {
    return characterId as OnboardingSeedKey
  }

  const slug = slugify(characterName)
  const bySlug: Record<string, OnboardingSeedKey> = {
    'lyra-ashveil': 'hm-seed-lyra',
    lyra: 'hm-seed-lyra',
    'kai-mercer': 'hm-seed-kai',
    kai: 'hm-seed-kai',
    aria: 'hm-seed-aria',
    seraph: 'hm-seed-seraph',
  }
  if (bySlug[slug]) return bySlug[slug]

  if (slug.includes('lyra')) return 'hm-seed-lyra'
  if (slug.includes('kai')) return 'hm-seed-kai'
  if (slug.includes('aria')) return 'hm-seed-aria'
  if (slug.includes('seraph')) return 'hm-seed-seraph'

  return null
}

export function resolveOnboardingReveal(
  characterId: string,
  characterName: string,
  greetingFallback: string
): string {
  const key = resolveOnboardingSeedKey(characterId, characterName)
  if (key) return ONBOARDING_REVEAL_MSG[key]
  const base =
    greetingFallback.trim() || '*leans in* So you are [name]. I have been waiting.'
  return base.includes('[name]') ? base : `"${base}"`
}

export function resolveOnboardingTeaser(
  characterId: string,
  characterName: string,
  description: string,
  greeting: string
): string {
  const key = resolveOnboardingSeedKey(characterId, characterName)
  if (key) return ONBOARDING_TEASER[key]
  if (description.length > 0) return description.slice(0, 80)
  return greeting.slice(0, 80) || 'Someone is waiting for you.'
}
