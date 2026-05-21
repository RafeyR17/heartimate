/** Limits for OpenRouter context — row count alone is not enough for long messages. */

export const MAX_LLM_HISTORY_TURNS = 10
export const MAX_LLM_CONTEXT_CHARS = 24_000

export function trimMessagesForLLM<T extends { role: string; content: string }>(
  messages: T[],
  options?: { maxTurns?: number; maxChars?: number }
): T[] {
  const maxTurns = options?.maxTurns ?? MAX_LLM_HISTORY_TURNS
  const maxChars = options?.maxChars ?? MAX_LLM_CONTEXT_CHARS

  let trimmed = messages.slice(-maxTurns * 2)

  const charCount = () =>
    trimmed.reduce((sum, m) => sum + (m.content?.length ?? 0), 0)

  while (trimmed.length > 2 && charCount() > maxChars) {
    trimmed = trimmed.slice(1)
  }

  return trimmed
}
