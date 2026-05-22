import type { SupabaseClient } from '@supabase/supabase-js'
import {
  resolveOnboardingReveal,
  resolveOnboardingTeaser,
} from '@/lib/onboarding-copy'
import { serverLog } from '@/lib/server-log'

export type OnboardingStarter = {
  id: string
  name: string
  tag: string
  img: string
  teaser: string
  msg: string
}

const FALLBACK_IMG = '/images/characters/lyra.jpg'

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

    return {
      id,
      name,
      tag: firstTag(row.tags),
      img: (row.avatar_url as string | null) || FALLBACK_IMG,
      teaser: resolveOnboardingTeaser(id, name, description, greeting),
      msg: resolveOnboardingReveal(id, name, greeting),
    }
  })
}
