/** Pure date helpers — pass `referenceMs` from server loaders, not React render. */

export function daysSinceMs(startIso: string, referenceMs: number, min = 0): number {
  const days = Math.floor((referenceMs - new Date(startIso).getTime()) / 86_400_000)
  return Math.max(min, days)
}

export function ceilDaysSinceMs(startIso: string, referenceMs: number, min = 1): number {
  const days = Math.ceil((referenceMs - new Date(startIso).getTime()) / 86_400_000)
  return Math.max(min, days)
}

export function storyDaysSince(startedAt: string): number {
  return ceilDaysSinceMs(startedAt, Date.now())
}
