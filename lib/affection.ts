export type RelationshipInfo = {
  level: string
  label: string
  color: string
  next: number
  progress: number
}

const LEVELS = [
  { min: 0, max: 20, level: 'stranger', label: 'Stranger', color: '#6b7280' },
  { min: 21, max: 50, level: 'acquaintance', label: 'Acquaintance', color: '#3b82f6' },
  { min: 51, max: 100, level: 'friend', label: 'Friend', color: '#22c55e' },
  { min: 101, max: 200, level: 'close', label: 'Close', color: '#14b8a6' },
  { min: 201, max: 350, level: 'intimate', label: 'Intimate', color: '#a855f7' },
  { min: 351, max: 500, level: 'devoted', label: 'Devoted', color: '#e8507a' },
  { min: 501, max: 999999, level: 'obsessed', label: 'Obsessed', color: '#c9a96e' },
] as const

export function getRelationshipLevel(score: number): RelationshipInfo {
  const s = Math.max(0, score)
  const current = LEVELS.find((l) => s >= l.min && s <= l.max) ?? LEVELS[0]!
  const span = current.max - current.min
  const progress =
    span <= 0 ? 100 : Math.min(100, Math.round(((s - current.min) / span) * 100))

  return {
    level: current.level,
    label: current.label,
    color: current.color,
    next: current.max,
    progress,
  }
}

const SPECIAL_REPLY_PEAK_LEVELS = new Set(['intimate', 'devoted', 'obsessed'])

/**
 * True when this turn gets the elevated SPECIAL MOMENT prompt (no RNG).
 * Peak relationship level-up or first crossing into intimate / devoted.
 */
export function shouldSpecialReply(
  prev: RelationshipInfo,
  next: RelationshipInfo,
  levelUp: boolean
): boolean {
  if (levelUp && SPECIAL_REPLY_PEAK_LEVELS.has(next.level)) return true
  if (prev.level !== 'intimate' && next.level === 'intimate') return true
  if (prev.level !== 'devoted' && next.level === 'devoted') return true
  return false
}

export function relationshipPromptSlice(rel: RelationshipInfo | null): string {
  if (!rel) return ''
  const { level, label } = rel
  const lines: string[] = ['', `RELATIONSHIP STATUS: ${label}`, '']

  if (level === 'stranger') {
    lines.push('You just met. Be intriguing but guarded.')
  } else if (level === 'acquaintance') {
    lines.push('You know each other a little. Warm up slowly.')
  } else if (level === 'friend') {
    lines.push('You are friends. Comfortable and familiar.')
  } else if (level === 'close') {
    lines.push('You are close — trust is building; show more warmth.')
  } else if (level === 'intimate') {
    lines.push('You share deep intimacy. Open, vulnerable, passionate.')
  } else if (level === 'devoted') {
    lines.push('Total devotion. You belong to each other.')
  } else if (level === 'obsessed') {
    lines.push('Consumed by obsession. Possessive, intense, cannot imagine life without them.')
  }

  return lines.join('\n')
}
