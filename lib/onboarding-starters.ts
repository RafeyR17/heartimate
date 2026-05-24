import type { SupabaseClient } from '@supabase/supabase-js'
import {
  resolveOnboardingReveal,
  resolveOnboardingTeaser,
} from '@/lib/onboarding-copy'
import {
  ONBOARDING_STARTER_FALLBACK_IMG,
  type OnboardingStarter,
} from '@/lib/onboarding-starter-shared'
import { serverLog } from '@/lib/server-log'

export type { OnboardingStarter } from '@/lib/onboarding-starter-shared'
export { ONBOARDING_STARTER_FALLBACK_IMG } from '@/lib/onboarding-starter-shared'

const FALLBACK_IMG = ONBOARDING_STARTER_FALLBACK_IMG

function firstTag(tags: unknown): string {
  if (Array.isArray(tags) && tags.length > 0 && typeof tags[0] === 'string') {
    return tags[0].toUpperCase()
  }
  return 'ROMANCE'
}

export async function fetchOnboardingStarters(
  supabase: SupabaseClient,
  limit = 3
): Promise<OnboardingStarter[]> {
  const { data, error } = await supabase
    .from('characters')
    .select('id, name, description, avatar_url, tags, greeting')
    .eq('is_public', true)
    .order('created_at', { ascending: true })
    .limit(limit)

  if (error) {
    serverLog.error('onboarding-starters', 'fetch error', error)
    return []
  }

  return (data ?? []).map((row) => {
    const id = row.id as string
    const name = row.name as string
    const description = String(row.description ?? '').trim()
    const greeting = String(row.greeting ?? '').trim()

    const tags = Array.isArray(row.tags)
      ? (row.tags as string[]).filter((t) => typeof t === 'string')
      : []

    return {
      id,
      name,
      tag: firstTag(row.tags),
      img: (row.avatar_url as string | null) || FALLBACK_IMG,
      description,
      tags,
      teaser: resolveOnboardingTeaser(id, name, description, greeting),
      msg: resolveOnboardingReveal(id, name, greeting),
    }
  })
}
