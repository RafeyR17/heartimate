import { describe, expect, it } from 'vitest'
import {
  parseTagsField,
  validateCharacterFormInput,
  validateDisplayName,
  validatePersonaFormInput,
} from '@/lib/api-validation'

describe('validateDisplayName', () => {
  it('rejects empty', () => {
    expect(validateDisplayName('  ').ok).toBe(false)
  })

  it('accepts trimmed name', () => {
    const result = validateDisplayName('  River  ')
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value).toBe('River')
  })
})

describe('validateCharacterFormInput', () => {
  it('requires personality and greeting', () => {
    const result = validateCharacterFormInput({
      name: 'Lyra',
      personality: '',
      greeting: 'Hi',
      tagsRaw: '[]',
    })
    expect(result.ok).toBe(false)
  })

  it('parses tags array', () => {
    const result = validateCharacterFormInput({
      name: 'Lyra',
      personality: 'Bold',
      greeting: 'Hi',
      tagsRaw: '["Romance","Sci-Fi"]',
      exampleDialogs: '[]',
    })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value.tags).toEqual(['Romance', 'Sci-Fi'])
  })
})

describe('parseTagsField', () => {
  it('rejects invalid JSON', () => {
    expect(parseTagsField('not-json').ok).toBe(false)
  })
})

describe('validatePersonaFormInput', () => {
  it('requires name', () => {
    expect(validatePersonaFormInput({ name: '' }).ok).toBe(false)
  })
})
