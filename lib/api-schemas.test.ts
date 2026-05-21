import { describe, expect, it } from 'vitest'
import {
  chatPostSchema,
  chatsPostSchema,
  onboardingPostSchema,
  parseBody,
  reportsPostSchema,
  usersMePatchJsonSchema,
} from '@/lib/api-schemas'

describe('chatsPostSchema', () => {
  it('accepts valid body', () => {
    const result = chatsPostSchema.safeParse({
      characterId: 'char-1',
      personaId: null,
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing characterId', () => {
    const result = chatsPostSchema.safeParse({})
    expect(result.success).toBe(false)
  })
})

describe('chatPostSchema', () => {
  it('accepts omitUserPersist', () => {
    const result = chatPostSchema.safeParse({
      chatId: 'c1',
      content: 'hello',
      omitUserPersist: true,
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty content', () => {
    const result = chatPostSchema.safeParse({
      chatId: 'c1',
      content: '   ',
    })
    expect(result.success).toBe(false)
  })
})

describe('onboardingPostSchema', () => {
  it('trims display name and caps kink prefs', () => {
    const result = onboardingPostSchema.safeParse({
      displayName: '  Alex  ',
      kinkPrefs: ['romance'],
      starterCharId: 'starter-1',
      isAdult: true,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.displayName).toBe('Alex')
      expect(result.data.displayName.length).toBeLessThanOrEqual(50)
      expect(result.data.kinkPrefs).toEqual(['romance'])
    }
  })

  it('rejects isAdult false with Must be 18 or older', () => {
    const result = onboardingPostSchema.safeParse({
      displayName: 'Alex',
      starterCharId: 'starter-1',
      isAdult: false,
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Must be 18 or older')
    }
  })

  it('rejects missing isAdult', () => {
    const result = onboardingPostSchema.safeParse({
      displayName: 'Alex',
      starterCharId: 'starter-1',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes('isAdult'))).toBe(
        true
      )
    }
  })
})

describe('reportsPostSchema', () => {
  it('requires details for Other', () => {
    const result = reportsPostSchema.safeParse({
      characterId: 'c1',
      reason: 'Other',
    })
    expect(result.success).toBe(false)
  })

  it('accepts Other with details', () => {
    const result = reportsPostSchema.safeParse({
      characterId: 'c1',
      reason: 'Other',
      details: 'spam bots',
    })
    expect(result.success).toBe(true)
  })
})

describe('parseBody', () => {
  it('returns apiError response on invalid data', () => {
    const result = parseBody(chatsPostSchema, {})
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.response.status).toBe(400)
    }
  })
})

describe('usersMePatchJsonSchema', () => {
  it('rejects empty display name', () => {
    const result = usersMePatchJsonSchema.safeParse({ displayName: '   ' })
    expect(result.success).toBe(false)
  })

  it('accepts bio null', () => {
    const result = usersMePatchJsonSchema.safeParse({ bio: null })
    expect(result.success).toBe(true)
  })
})
