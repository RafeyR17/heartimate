import { describe, expect, it } from 'vitest'
import {
  buildSystemPrompt,
  fillPromptPlaceholders,
  NSFW_OBSESSION_SYSTEM_PROMPT,
} from '@/lib/prompt'

describe('fillPromptPlaceholders', () => {
  it('substitutes all template tokens', () => {
    const filled = fillPromptPlaceholders(NSFW_OBSESSION_SYSTEM_PROMPT, {
      charName: 'Lyra',
      userName: 'Alex',
      relationshipLevel: 'Devoted',
      memorySummary: 'They shared wine on the roof.',
      userKinks: 'possessive, praise',
    })
    expect(filled).toContain('You are Lyra, Alex')
    expect(filled).toContain('Current Relationship: Devoted')
    expect(filled).toContain('They shared wine on the roof.')
    expect(filled).toContain('possessive, praise')
    expect(filled).not.toContain('{{')
  })
})

describe('buildSystemPrompt NSFW', () => {
  it('uses the obsession template with filled placeholders', () => {
    const prompt = buildSystemPrompt(
      {
        name: 'Mira',
        personality: 'Bold',
        scenario: 'Penthouse',
        greeting: 'Hi',
        example_dialogs: '',
        tags: [],
        is_nsfw: true,
      },
      'Last night was filthy.',
      'Jordan',
      ['breeding', 'praise'],
      null,
      { level: 'intimate', label: 'Intimate' }
    )
    expect(prompt).toContain('You are Mira, Jordan')
    expect(prompt).toContain('Last night was filthy.')
    expect(prompt).toContain('breeding, praise')
    expect(prompt).toContain('Current Relationship: Intimate')
    expect(prompt).not.toContain('{{char}}')
    expect(prompt).not.toContain('CORE IDENTITY:')
    expect(prompt).toContain('FORMATTING RULES — FOLLOW EXACTLY')
    expect(prompt).toContain('ADULT ROLEPLAY RULES (STRICTLY FOLLOW)')
    expect(prompt).toContain('WRONG — NEVER DO THIS')
    expect(prompt).toContain('CORRECT:')
  })
})
