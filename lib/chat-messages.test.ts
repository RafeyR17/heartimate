import { describe, expect, it } from 'vitest'
import {
  CHAT_MESSAGES_PAGE_DEFAULT,
  CHAT_MESSAGES_PAGE_MAX,
  parseChatMessagesLimit,
} from './chat-messages'

describe('parseChatMessagesLimit', () => {
  it('defaults to 50', () => {
    expect(parseChatMessagesLimit(null)).toBe(CHAT_MESSAGES_PAGE_DEFAULT)
    expect(parseChatMessagesLimit('')).toBe(CHAT_MESSAGES_PAGE_DEFAULT)
    expect(parseChatMessagesLimit('nope')).toBe(CHAT_MESSAGES_PAGE_DEFAULT)
  })

  it('caps at max 100', () => {
    expect(parseChatMessagesLimit('200')).toBe(CHAT_MESSAGES_PAGE_MAX)
    expect(parseChatMessagesLimit('100')).toBe(100)
  })

  it('accepts valid limits', () => {
    expect(parseChatMessagesLimit('50')).toBe(50)
    expect(parseChatMessagesLimit('1')).toBe(1)
  })
})
