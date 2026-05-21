import { getRecentPersonaIds, recordRecentPersona } from '@/lib/client-storage'

export { getRecentPersonaIds, recordRecentPersona }

export function sortPersonasByRecent<T extends { id: string }>(
  personas: T[],
  recentIds: string[]
): { recent: T[]; rest: T[] } {
  const recent: T[] = []
  const rest: T[] = []
  const recentSet = new Set(recentIds.slice(0, 3))

  for (const id of recentIds.slice(0, 3)) {
    const match = personas.find((p) => p.id === id)
    if (match) recent.push(match)
  }

  for (const persona of personas) {
    if (!recentSet.has(persona.id)) rest.push(persona)
  }

  return { recent, rest }
}
