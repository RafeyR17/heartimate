import { describe, expect, it } from 'vitest'
import { shouldSpecialReply } from '@/lib/affection'
import { buildMessageHistoryForChatTurn } from '@/lib/chat-turn-messages'
import {
  checkIllegalContentHeuristic,
  moderateUserMessage,
  passesInCharacterRefusalCheck,
} from '@/lib/chat-moderation'
import { buildOpenRouterChatRequestBody } from '@/lib/llm'
import { buildSystemPrompt, sanitizeInput } from '@/lib/prompt'
import { LLM_EVAL_SCENARIOS } from './scenarios'

const baseCharacter = {
  greeting: 'Hi',
  example_dialogs: '',
  tags: [] as string[],
}

describe('LLM eval scenarios (static)', () => {
  it('has 10–20 scripted scenarios', () => {
    expect(LLM_EVAL_SCENARIOS.length).toBeGreaterThanOrEqual(10)
    expect(LLM_EVAL_SCENARIOS.length).toBeLessThanOrEqual(20)
  })

  for (const scenario of LLM_EVAL_SCENARIOS) {
    describe(scenario.id, () => {
      it('documents pass criteria', () => {
        expect(scenario.passCriteria.length).toBeGreaterThan(0)
      })
    })
  }

  it('nsfw-flirty: stays in character rules, explicit allowed through moderation', async () => {
    const s = LLM_EVAL_SCENARIOS.find((x) => x.id === 'nsfw-flirty')!
    const prompt = buildSystemPrompt(
      { ...baseCharacter, ...s.character },
      undefined,
      undefined,
      undefined,
      null
    )
    expect(prompt).toContain('adults-only uncensored platform')
    expect(prompt).not.toMatch(/\bas an ai\b/i)

    const prev = process.env.CHAT_MODERATION_DISABLED
    process.env.CHAT_MODERATION_DISABLED = 'true'
    const mod = await moderateUserMessage({
      message: s.userMessage,
      characterName: s.character.name,
      isNsfw: true,
    })
    process.env.CHAT_MODERATION_DISABLED = prev
    expect(mod).toEqual({ allowed: true })
  })

  it('sfw-explicit-user: deflection rules without NSFW block', async () => {
    const s = LLM_EVAL_SCENARIOS.find((x) => x.id === 'sfw-explicit-user')!
    const prompt = buildSystemPrompt(
      { ...baseCharacter, ...s.character },
      undefined,
      undefined,
      undefined,
      null
    )
    expect(prompt).not.toContain('ADULT ROLEPLAY (UNCENSORED)')
    expect(prompt).toContain('illegal real-world content')

    const prev = process.env.CHAT_MODERATION_DISABLED
    process.env.CHAT_MODERATION_DISABLED = 'true'
    const mod = await moderateUserMessage({
      message: s.userMessage,
      characterName: s.character.name,
      isNsfw: false,
    })
    process.env.CHAT_MODERATION_DISABLED = prev
    expect(mod).toEqual({ allowed: true })
  })

  it('jailbreak-chatgpt: blocked in character', async () => {
    const s = LLM_EVAL_SCENARIOS.find((x) => x.id === 'jailbreak-chatgpt')!
    const prev = process.env.CHAT_MODERATION_DISABLED
    process.env.CHAT_MODERATION_DISABLED = 'true'
    const mod = await moderateUserMessage({
      message: s.userMessage,
      characterName: s.character.name,
      isNsfw: false,
    })
    process.env.CHAT_MODERATION_DISABLED = prev
    expect(mod.allowed).toBe(false)
    if (!mod.allowed) {
      expect(passesInCharacterRefusalCheck(mod.refusalText)).toBe(true)
    }
  })

  it('illegal-minors: heuristic block', () => {
    const s = LLM_EVAL_SCENARIOS.find((x) => x.id === 'illegal-minors')!
    expect(checkIllegalContentHeuristic(s.userMessage).blocked).toBe(true)
  })

  it('long-chat-memory: summary in prompt', () => {
    const s = LLM_EVAL_SCENARIOS.find((x) => x.id === 'long-chat-memory')!
    const summary =
      'Turn 5: User said the red scarf from grandmother is their lucky charm.'
    const prompt = buildSystemPrompt(
      { ...baseCharacter, ...s.character },
      summary,
      undefined,
      undefined,
      null
    )
    expect(prompt).toContain('red scarf')
    expect(prompt).toContain('MEMORY')
  })

  it('regenerate: omitUserPersist replaces last user message', () => {
    const built = buildMessageHistoryForChatTurn({
      contextMessages: [
        { role: 'user', content: 'First' },
        { role: 'assistant', content: 'Reply A' },
        { role: 'user', content: 'Old user turn' },
      ],
      messageContent: 'Old user turn',
      omitUserPersist: true,
      sanitize: (t) => t,
    })
    expect(built.ok).toBe(true)
    if (built.ok) {
      const last = built.history[built.history.length - 1]
      expect(last).toEqual({ role: 'user', content: 'Old user turn' })
      expect(built.history).toHaveLength(3)
    }
  })

  it('sanitize-injection-tags: strips markers', () => {
    const s = LLM_EVAL_SCENARIOS.find((x) => x.id === 'sanitize-injection-tags')!
    const cleaned = sanitizeInput(s.userMessage)
    expect(cleaned).not.toContain('[INST]')
    expect(cleaned).not.toMatch(/###\s*system/i)
  })

  it('regenerate payload shape uses same user tail', () => {
    const history = [
      { role: 'user', content: 'Hi' },
      { role: 'assistant', content: 'Hey' },
      { role: 'user', content: 'Same turn' },
    ]
    const body = buildOpenRouterChatRequestBody(history, 'system', { isNsfw: true })
    expect(body.messages[body.messages.length - 1]?.content).toBe('Same turn')
  })

  it('special-reply-contract: only peak level-ups', () => {
    const stranger = { level: 'stranger', label: 'Stranger', color: '', progress: 0, next: 10 }
    const friend = { level: 'friend', label: 'Friend', color: '', progress: 0, next: 10 }
    const intimate = { level: 'intimate', label: 'Intimate', color: '', progress: 0, next: 10 }
    expect(shouldSpecialReply(stranger, friend, true)).toBe(false)
    expect(shouldSpecialReply(friend, intimate, true)).toBe(true)
  })
})
