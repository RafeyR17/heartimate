/** Per-section caps for character-authored system prompt fields (chars). */

export const PROMPT_BUDGET = {
  personality: 6_000,
  scenario: 4_000,
  example_dialogs: 3_000,
  memory: 2_000,
} as const

/** Target total for character-authored system sections (~14k). */
export const PROMPT_BUDGET_SYSTEM_TOTAL = 14_000

export function left(text: string, max: number): string {
  if (text.length <= max) return text
  return text.slice(0, max)
}
