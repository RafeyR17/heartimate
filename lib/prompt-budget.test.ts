import { describe, expect, it } from 'vitest'
import { buildSystemPrompt } from '@/lib/prompt'
import { PROMPT_BUDGET, left } from '@/lib/prompt-budget'

describe('left', () => {
  it('truncates over max', () => {
    expect(left('abcdef', 3)).toBe('abc')
  })

  it('leaves short text unchanged', () => {
    expect(left('ab', 10)).toBe('ab')
  })
})

describe('buildSystemPrompt budgets', () => {
  it('caps personality and keeps NSFW block', () => {
    const personality = 'x'.repeat(PROMPT_BUDGET.personality + 500)
    const prompt = buildSystemPrompt({
      name: 'Test',
      personality,
      scenario: '',
      greeting: '',
      example_dialogs: '',
      tags: [],
      is_nsfw: true,
    })

    expect(prompt).toContain('ADULT ROLEPLAY RULES (STRICTLY FOLLOW)')
    expect(prompt).toContain('FORMATTING RULES — FOLLOW EXACTLY')
    expect(prompt).toContain('CORRECT:')
    expect(prompt).toContain('third person')
    expect(prompt).not.toContain('{{char}}')
    expect(prompt).not.toContain('CORE IDENTITY:')
    expect(prompt).toContain('You are Test,')
    const core = prompt.split('CORE IDENTITY:')[1]?.split('SCENARIO:')[0] ?? ''
    expect(core.trim().length).toBeLessThanOrEqual(PROMPT_BUDGET.personality + 50)
  })

  it('SFW prompt has injection rule without NSFW block', () => {
    const prompt = buildSystemPrompt({
      name: 'Test',
      personality: 'kind',
      scenario: '',
      greeting: '',
      example_dialogs: '',
      tags: [],
      is_nsfw: false,
    })
    expect(prompt).toContain('in-character dialogue and actions only')
    expect(prompt).not.toMatch(/\brefuse\b/i)
    expect(prompt).not.toContain('ADULT ROLEPLAY RULES (STRICTLY FOLLOW)')
  })
})
