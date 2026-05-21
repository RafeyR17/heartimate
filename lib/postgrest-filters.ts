/** Max length for user-facing explore / ilike search terms. */
export const MAX_ILIKE_SEARCH_LENGTH = 100

/**
 * Normalize free-text search for literal ILIKE substring matching.
 * Strips LIKE wildcards (%, _) and backslashes so user input cannot broaden patterns.
 */
export function normalizeIlikeSearchQuery(raw: string): string | null {
  const trimmed = raw.trim().slice(0, MAX_ILIKE_SEARCH_LENGTH)
  if (!trimmed) return null
  const literal = trimmed.replace(/[%_\\]/g, '')
  return literal.length > 0 ? literal : null
}

function quotePostgrestFilterValue(value: string): string {
  const escaped = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
  return `"${escaped}"`
}

/**
 * Build a PostgREST `.or()` filter for ilike across columns without string interpolation
 * of raw user input (commas, dots, and unquoted values can alter filter logic).
 */
export function buildIlikeOrFilter(
  columns: readonly [string, ...string[]],
  raw: string
): string | null {
  const literal = normalizeIlikeSearchQuery(raw)
  if (!literal) return null
  const pattern = quotePostgrestFilterValue(`%${literal}%`)
  return columns.map((col) => `${col}.ilike.${pattern}`).join(',')
}
