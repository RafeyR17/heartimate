import { revalidateTag } from 'next/cache'

/** ISR / unstable_cache tag for explore catalog queries. */
export const EXPLORE_CACHE_TAG = 'explore' as const

export function characterCacheTag(id: string): string {
  return `character-${id}`
}

/** Call after public catalog mutations (create/update/delete public character). */
export function revalidateExploreCatalog(characterId?: string): void {
  revalidateTag(EXPLORE_CACHE_TAG, 'max')
  if (characterId) {
    revalidateTag(characterCacheTag(characterId), 'max')
  }
}
