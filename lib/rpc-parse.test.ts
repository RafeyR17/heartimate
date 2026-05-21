import { describe, expect, it } from 'vitest'
import { parseChatTurnContextRpc, parseSidebarContextRpc } from '@/lib/rpc-parse'

describe('parseSidebarContextRpc', () => {
  it('parses valid sidebar RPC payload', () => {
    const parsed = parseSidebarContextRpc({
      ok: true,
      display_name: 'Ada',
      avatar_url: '/a.jpg',
      streak_count: 3,
      chats: [
        {
          id: 'c1',
          character: { name: 'Lyra', avatar_url: null },
          persona: { name: 'Work' },
        },
      ],
    })
    expect(parsed?.displayName).toBe('Ada')
    expect(parsed?.chats).toHaveLength(1)
    expect(parsed?.chats[0]?.character?.name).toBe('Lyra')
  })

  it('returns null when ok is false', () => {
    expect(parseSidebarContextRpc({ ok: false })).toBeNull()
  })
})

describe('parseChatTurnContextRpc', () => {
  it('parses valid chat turn context', () => {
    const parsed = parseChatTurnContextRpc({
      ok: true,
      chat: {
        id: 'chat-1',
        user_id: 'u1',
        persona_id: null,
        affection_score: 5,
        relationship_level: 'friend',
        total_messages: 10,
      },
      character: {
        id: 'char-1',
        name: 'Lyra',
        personality: 'warm',
        scenario: '',
        greeting: 'hi',
        example_dialogs: '',
        tags: ['fantasy'],
        is_nsfw: false,
      },
      persona: null,
      messages: [{ role: 'user', content: 'Hello' }],
      memory_summary: 'They met at a cafe.',
    })
    expect(parsed?.chat.id).toBe('chat-1')
    expect(parsed?.character.name).toBe('Lyra')
    expect(parsed?.messages).toHaveLength(1)
    expect(parsed?.memorySummary).toContain('cafe')
  })
})
