import { describe, expect, it } from 'vitest'
import { trimMessagesForLLM } from '@/lib/llm-context'

describe('trimMessagesForLLM', () => {
  it('keeps only the last N turns', () => {
    const messages = Array.from({ length: 30 }, (_, i) => ({
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: `m${i}`,
    }))
    const trimmed = trimMessagesForLLM(messages, { maxTurns: 3, maxChars: 1_000_000 })
    expect(trimmed).toHaveLength(6)
    expect(trimmed[0]?.content).toBe('m24')
  })

  it('drops oldest messages when total chars exceed cap', () => {
    const messages = [
      { role: 'user', content: 'x'.repeat(20_000) },
      { role: 'assistant', content: 'y'.repeat(20_000) },
      { role: 'user', content: 'recent' },
    ]
    const trimmed = trimMessagesForLLM(messages, { maxTurns: 10, maxChars: 5000 })
    expect(trimmed.some((m) => m.content === 'recent')).toBe(true)
    expect(trimmed.length).toBeLessThan(3)
  })
})
