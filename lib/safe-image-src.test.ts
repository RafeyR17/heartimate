import { describe, expect, it } from 'vitest'
import { resolveCharacterImageSrc } from '@/lib/safe-image-src'

describe('resolveCharacterImageSrc', () => {
  it('uses fallback for empty or unsupported URLs', () => {
    expect(resolveCharacterImageSrc(null)).toBe('/images/characters/lyra.jpg')
    expect(resolveCharacterImageSrc('')).toBe('/images/characters/lyra.jpg')
    expect(resolveCharacterImageSrc('https://evil.example/a.png')).toBe(
      '/images/characters/lyra.jpg'
    )
  })

  it('allows local and Supabase avatar URLs', () => {
    expect(resolveCharacterImageSrc('/images/characters/kai.jpg')).toBe(
      '/images/characters/kai.jpg'
    )
    expect(
      resolveCharacterImageSrc(
        'https://abc.supabase.co/storage/v1/object/public/avatars/x.webp'
      )
    ).toBe('https://abc.supabase.co/storage/v1/object/public/avatars/x.webp')
  })
})
