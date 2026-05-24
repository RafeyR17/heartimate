import { describe, expect, it } from 'vitest'
import { parseChatImageCommand } from '@/lib/chat-image-command'

describe('parseChatImageCommand', () => {
  it('parses /pic with description', () => {
    expect(parseChatImageCommand('/pic beautiful sunset')).toBe('beautiful sunset')
  })

  it('parses bare /image', () => {
    expect(parseChatImageCommand('/image')).toBe('')
  })

  it('returns null for normal text', () => {
    expect(parseChatImageCommand('hello')).toBeNull()
  })
})
