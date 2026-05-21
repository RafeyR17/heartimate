import { describe, expect, it } from 'vitest'
import { validateChatMessageContent } from '@/lib/chat-limits'

describe('validateChatMessageContent', () => {
  it('rejects non-string', () => {
    const result = validateChatMessageContent(42)
    expect(result.ok).toBe(false)
  })

  it('rejects empty after trim', () => {
    const result = validateChatMessageContent('   ')
    expect(result.ok).toBe(false)
  })

  it('accepts valid message', () => {
    const result = validateChatMessageContent('  hello world  ')
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.content).toBe('hello world')
  })
})
