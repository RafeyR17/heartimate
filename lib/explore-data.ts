import { unstable_cache } from 'next/cache'
import { getServiceRoleClient } from '@/lib/service-role'
import {
  buildIlikeOrFilter,
  normalizeIlikeSearchQuery,
} from '@/lib/postgrest-filters'
import { EXPLORE_CACHE_TAG } from '@/lib/cache-tags'
import { serverLog } from '@/lib/server-log'

/** Max rows per Explore request (all sorts). */
export const MAX_EXPLORE_ROWS = 500

export const EXPLORE_PAGE_REVALIDATE = 120

export type ExploreCharacterRow = {
  id: string
  name: string
  avatar_url: string
  description: string
  tags: string[]
  is_nsfw: boolean
  likes_count: number
  chat_count: number
  created_at: string
  users: { display_name: string } | null
}

export type ExplorePageData = {
  characters: ExploreCharacterRow[]
  totalCount: number
  hasMore: boolean
  displayTotalCount: number
  fetchError: string | null
}

export type ExploreQueryKey = {
  q: string
  tags: string
  sort: string
  limit: number
  page: number
}

function normalizeTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return []
  return tags.filter((t): t is string => typeof t === 'string')
}

export function clampExploreLimit(raw: number): number {
  if (!Number.isFinite(raw) || raw < 1) return 20
  return Math.min(Math.floor(raw), MAX_EXPLORE_ROWS)
}

export function parseExploreSearchParams(params: {
  q?: string
  tags?: string
  sort?: string
  limit?: string
  page?: string
}): ExploreQueryKey {
  const parsedLimit = parseInt(params.limit || '20', 10)
  const urlLimit = Number.isFinite(parsedLimit) ? parsedLimit : 20
  const parsedPage = parseInt(params.page || '1', 10)
  const urlPage = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1
  return {
    q: params.q || '',
    tags: params.tags || '',
    sort: params.sort || 'trending',
    limit: clampExploreLimit(urlLimit),
    page: urlPage,
  }
}

function exploreCacheKey(key: ExploreQueryKey): string {
  return [key.q, key.tags, key.sort, String(key.limit), String(key.page)].join('|')
}

async function fetchExplorePage(key: ExploreQueryKey): Promise<ExplorePageData> {
  const supabase = getServiceRoleClient()
  const queryText = key.q
  const selectedTags = key.tags ? key.tags.split(',').filter(Boolean) : []
  const sortOption = key.sort
  const effectiveLimit = key.limit
  const page = key.page
  const searchLiteral = normalizeIlikeSearchQuery(queryText)
  const searchOrFilter = buildIlikeOrFilter(['name', 'description'], queryText)

  let processedCharacters: ExploreCharacterRow[] = []
  let totalCount = 0
  let fetchError: string | null = null

  if (sortOption === 'random') {
    let countQ = supabase
      .from('characters')
      .select('*', { count: 'exact', head: true })
      .eq('is_public', true)
    if (searchOrFilter) {
      countQ = countQ.or(searchOrFilter)
    }
    if (selectedTags.length > 0) {
      countQ = countQ.overlaps('tags', selectedTags)
    }

    const { count, error: countError } = await countQ
    if (countError) {
      serverLog.error('explore-data', 'count error', countError)
      fetchError = 'Could not load characters. Please try again.'
    }
    totalCount = count ?? 0

    const { data: randomRows, error: rpcError } = await supabase.rpc(
      'explore_public_characters_random',
      {
        p_limit: effectiveLimit,
        p_search: searchLiteral,
        p_tags: selectedTags.length > 0 ? selectedTags : null,
      }
    )

    if (rpcError) {
      serverLog.error('explore-data', 'random RPC error', rpcError)
      fetchError = 'Could not load characters. Please try again.'
    }

    processedCharacters = (randomRows || []).map((row: Record<string, unknown>) => ({
      id: String(row.id),
      name: String(row.name),
      avatar_url: row.avatar_url != null ? String(row.avatar_url) : '',
      description: row.description != null ? String(row.description) : '',
      tags: normalizeTags(row.tags),
      is_nsfw: Boolean(row.is_nsfw),
      likes_count:
        row.likes_count != null ? Number(row.likes_count as number | bigint) : 0,
      chat_count:
        row.chat_count != null ? Number(row.chat_count as number | bigint) : 0,
      created_at: String(row.created_at),
      users:
        row.creator_display_name != null
          ? { display_name: String(row.creator_display_name) }
          : null,
    }))
  } else {
    let dbQuery = supabase
      .from('characters')
      .select(
        `
      id,
      name,
      avatar_url,
      description,
      tags,
      is_nsfw,
      likes_count,
      chat_count,
      created_at,
      users (
        display_name
      )
    `,
        { count: 'exact' }
      )
      .eq('is_public', true)

    if (searchOrFilter) {
      dbQuery = dbQuery.or(searchOrFilter)
    }
    if (selectedTags.length > 0) {
      dbQuery = dbQuery.overlaps('tags', selectedTags)
    }

    if (sortOption === 'likes') {
      dbQuery = dbQuery.order('likes_count', { ascending: false })
    } else if (sortOption === 'chats') {
      dbQuery = dbQuery.order('chat_count', { ascending: false })
    } else if (sortOption === 'newest') {
      dbQuery = dbQuery.order('created_at', { ascending: false })
    } else if (sortOption === 'trending') {
      dbQuery = dbQuery.order('likes_count', { ascending: false })
    }

    dbQuery = dbQuery.range((page - 1) * effectiveLimit, page * effectiveLimit - 1)

    const { data: characters, count, error } = await dbQuery

    if (error) {
      serverLog.error('explore-data', 'fetch error', error)
      fetchError = 'Could not load characters. Please try again.'
    }

    totalCount = count ?? 0

    processedCharacters = (characters || []).map((c) => {
      const rawUsers = c.users
      const creator = rawUsers
        ? Array.isArray(rawUsers)
          ? rawUsers[0]
          : rawUsers
        : null
      return {
        id: String(c.id),
        name: String(c.name),
        avatar_url: c.avatar_url != null ? String(c.avatar_url) : '',
        description: c.description != null ? String(c.description) : '',
        tags: normalizeTags(c.tags),
        is_nsfw: Boolean(c.is_nsfw),
        likes_count: Number(c.likes_count ?? 0),
        chat_count: Number(c.chat_count ?? 0),
        created_at: String(c.created_at),
        users:
          creator &&
          typeof creator === 'object' &&
          creator !== null &&
          'display_name' in creator
            ? {
                display_name: String(
                  (creator as { display_name: string }).display_name
                ),
              }
            : null,
      }
    })
  }

  const cappedTotal = Math.min(totalCount, MAX_EXPLORE_ROWS)
  const isRandomSort = sortOption === 'random'
  const hasMore = isRandomSort ? false : (page * effectiveLimit) < cappedTotal
  const displayTotalCount = isRandomSort
    ? processedCharacters.length
    : totalCount

  return {
    characters: processedCharacters,
    totalCount,
    hasMore,
    displayTotalCount,
    fetchError,
  }
}

/** Cached explore catalog — keyed by q, tags, sort, limit. Random sort bypasses cache. */
export async function getExplorePageData(key: ExploreQueryKey): Promise<ExplorePageData> {
  if (key.sort === 'random') {
    return fetchExplorePage(key)
  }

  const cacheKey = exploreCacheKey(key)
  const cached = unstable_cache(
    () => fetchExplorePage(key),
    ['explore', cacheKey],
    { revalidate: EXPLORE_PAGE_REVALIDATE, tags: [EXPLORE_CACHE_TAG] }
  )
  return cached()
}
