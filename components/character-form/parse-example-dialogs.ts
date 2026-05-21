import type { ExampleDialog } from './types'

export function parseExampleDialogs(
  raw: string | null | undefined,
): ExampleDialog[] {
  const fallback: ExampleDialog[] = [{ user: '', char: '' }]
  if (!raw) return fallback
  try {
    const p = JSON.parse(raw)
    if (!Array.isArray(p) || p.length === 0) return fallback
    return p.map((d: { user?: string; char?: string }) => ({
      user: d.user || '',
      char: d.char || '',
    }))
  } catch {
    return fallback
  }
}
