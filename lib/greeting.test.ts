import { describe, expect, it } from 'vitest'
import { personalizeGreeting, resolveChatGreetingName } from '@/lib/greeting'
import { DEFAULT_PERSONA_NAME } from '@/lib/persona-constants'

describe('personalizeGreeting', () => {
  it('replaces [name] case-insensitively', () => {
    expect(
      personalizeGreeting('*smiles softly* Hi [name]... I am glad you are here.', 'Rafey')
    ).toBe('*smiles softly* Hi Rafey... I am glad you are here.')
  })

  it('returns greeting unchanged when no placeholder', () => {
    expect(personalizeGreeting('Welcome back.', 'Rafey')).toBe('Welcome back.')
  })

  it('uses fallback when name is empty', () => {
    expect(personalizeGreeting('Hi [name]', '  ')).toBe('Hi there')
  })
})

describe('resolveChatGreetingName', () => {
  it('prefers custom persona name over display name', () => {
    expect(
      resolveChatGreetingName({
        userDisplayName: 'Rafey',
        personaName: 'The Wanderer',
      })
    ).toBe('The Wanderer')
  })

  it('uses display name when persona is default placeholder', () => {
    expect(
      resolveChatGreetingName({
        userDisplayName: 'Rafey',
        personaName: DEFAULT_PERSONA_NAME,
      })
    ).toBe('Rafey')
  })

  it('falls back to there when no names', () => {
    expect(resolveChatGreetingName({})).toBe('there')
  })
})
