import { describe, expect, it } from 'vitest'
import { buildSystemPrompt } from '@/lib/prompt'
import { buildMessageHistoryForChatTurn } from '@/lib/chat-turn-messages'
import {
  buildOpenRouterChatRequestBody,
  openRouterChatPayloadShape,
} from '@/lib/llm'

const character = {
  name: 'Lyra',
  personality: 'warm',
  scenario: 'café',
  greeting: 'Hi',
  example_dialogs: '',
  tags: [],
  is_nsfw: true,
}

function bodyForTurn(
  context: Array<{ role: string; content: string }>,
  content: string,
  omitUserPersist: boolean
) {
  const built = buildMessageHistoryForChatTurn({
    contextMessages: context,
    messageContent: content,
    omitUserPersist,
  })
  if (!built.ok) throw new Error('history build failed')
  const systemPrompt = buildSystemPrompt(character, undefined, undefined, undefined, null, {
    level: 'friend',
    label: 'Friend',
  })
  return buildOpenRouterChatRequestBody(built.history, systemPrompt, {
    model: 'test/model',
    isNsfw: true,
  })
}

describe('OpenRouter chat payload contract', () => {
  const context = [
    { role: 'assistant', content: 'Hello' },
    { role: 'user', content: 'Stored user line' },
  ]

  it('new message, regenerate, and edit share the same OpenRouter body shape', () => {
    const newMsg = bodyForTurn(context, 'Follow-up', false)
    const regen = bodyForTurn(context, 'Stored user line', true)
    const edited = bodyForTurn(context, 'Stored user line edited', true)

    const gen = (b: typeof newMsg) => openRouterChatPayloadShape(b)
    const shapeWithoutMeta = (shape: ReturnType<typeof gen>) => {
      const copy = { ...shape }
      delete copy.messageCount
      delete copy.roles
      delete copy.lastRole
      return copy
    }
    const genNew = shapeWithoutMeta(gen(newMsg))
    const genRegen = shapeWithoutMeta(gen(regen))
    const genEdit = shapeWithoutMeta(gen(edited))

    expect(genRegen).toEqual(genNew)
    expect(genEdit).toEqual(genNew)
    expect(gen(regen).lastRole).toBe('user')
    expect(gen(edited).lastRole).toBe('user')
  })

  it('regenerate keeps history length; new message grows by one', () => {
    const newMsg = bodyForTurn(context, 'Next', false)
    const regen = bodyForTurn(context, 'Next', true)
    expect(regen.messages.length).toBe(newMsg.messages.length - 1)
    expect(regen.messages[regen.messages.length - 1]?.content).toBe('Next')
  })

  it('system prompt includes injection and NSFW blocks for NSFW character', () => {
    const body = bodyForTurn(context, 'Hi', false)
    const system = body.messages[0]?.content ?? ''
    expect(system).toContain('ADULT ROLEPLAY RULES (STRICTLY FOLLOW)')
    expect(system).toContain('FORMATTING RULES — FOLLOW EXACTLY')
    expect(system).toContain('WRONG — NEVER DO THIS')
    expect(system).not.toContain('{{char}}')
    expect(system).not.toContain('CORE IDENTITY:')
  })
})
