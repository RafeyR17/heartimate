import { describe, expect, it } from 'vitest'
import { buildMessageHistoryForChatTurn } from '@/lib/chat-turn-messages'

describe('buildMessageHistoryForChatTurn', () => {
  const context = [
    { role: 'assistant', content: 'Hi' },
    { role: 'user', content: 'Original' },
  ]

  it('appends user message on normal send', () => {
    const r = buildMessageHistoryForChatTurn({
      contextMessages: context,
      messageContent: 'New',
      omitUserPersist: false,
    })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.history).toHaveLength(3)
    expect(r.history[2]).toEqual({ role: 'user', content: 'New' })
  })

  it('replaces last user on regenerate without growing history', () => {
    const r = buildMessageHistoryForChatTurn({
      contextMessages: context,
      messageContent: 'Regenerated',
      omitUserPersist: true,
    })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.history).toHaveLength(2)
    expect(r.history[1]).toEqual({ role: 'user', content: 'Regenerated' })
  })

  it('replaces last user after edit (same as regenerate)', () => {
    const edited = buildMessageHistoryForChatTurn({
      contextMessages: context,
      messageContent: 'Edited text',
      omitUserPersist: true,
    })
    expect(edited.ok).toBe(true)
    if (!edited.ok) return
    expect(edited.history[1].content).toBe('Edited text')
  })

  it('fails when last context message is not user', () => {
    const r = buildMessageHistoryForChatTurn({
      contextMessages: [{ role: 'assistant', content: 'Only me' }],
      messageContent: 'Nope',
      omitUserPersist: true,
    })
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.error).toBe('last_not_user')
  })
})
