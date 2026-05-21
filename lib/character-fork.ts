export type ExampleDialog = { user: string; char: string }

export function parseExampleDialogs(text: string | null): ExampleDialog[] {
  if (!text?.trim()) return [{ user: '', char: '' }]

  try {
    const parsed = JSON.parse(text)
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map((row) => ({
        user: String(row.user ?? row.User ?? ''),
        char: String(row.char ?? row.Char ?? row.character ?? ''),
      }))
    }
  } catch {
    // fall through to line parser
  }

  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  const exchanges: ExampleDialog[] = []
  let current: ExampleDialog = { user: '', char: '' }

  for (const line of lines) {
    const clean = line.replace(/^[\s•\-*]+/, '')
    if (/^(user|{{user}}|you|player):/i.test(clean)) {
      if (current.user || current.char) exchanges.push(current)
      current = {
        user: clean.replace(/^(user|{{user}}|you|player):\s*/i, ''),
        char: '',
      }
    } else if (/^(char|character|{{char}}|assistant|bot|npc):/i.test(clean)) {
      current.char = clean.replace(/^(char|character|{{char}}|assistant|bot|npc):\s*/i, '')
    } else if (current.char) {
      current.char += `\n${clean}`
    } else if (current.user) {
      current.user += `\n${clean}`
    } else {
      current.char = clean
    }
  }

  if (current.user || current.char) exchanges.push(current)
  return exchanges.length > 0 ? exchanges : [{ user: '', char: '' }]
}

/** @deprecated import from `@/lib/client-storage` */
export { FORK_STORAGE_KEY } from '@/lib/client-storage'

export interface ForkPayload {
  fork: {
    name: string
    description: string
    personality: string
    scenario: string
    greeting: string
    exampleDialogs: ExampleDialog[]
    tags: string[]
    isNsfw: boolean
    isPublic: boolean
    avatarUrl: string | null
  }
  forkedFrom: {
    id: string
    name: string
  }
}
