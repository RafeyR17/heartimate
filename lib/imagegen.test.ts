import { describe, expect, it } from 'vitest'
import {
  buildCharacterImagePrompt,
  generateImageUrl,
  generateVariationUrls,
} from '@/lib/imagegen'

describe('buildCharacterImagePrompt', () => {
  it('includes tag styles and gender cues', () => {
    const prompt = buildCharacterImagePrompt({
      name: 'Lyra',
      description: 'A brunette vampire with green eyes',
      personality: 'She is cold and possessive',
      tags: ['Vampire', 'Dark Fantasy'],
      gender: 'Female',
    })
    expect(prompt).toContain('breathtakingly beautiful woman')
    expect(prompt).toContain('vampire aesthetic')
    expect(prompt).toContain('brunette')
    expect(prompt).toContain('dramatic rose and deep magenta rim lighting')
  })

  it('detects male gender', () => {
    const prompt = buildCharacterImagePrompt({
      name: 'Kai',
      description: 'He is a brooding warrior',
      tags: ['Warrior'],
      gender: 'Male',
    })
    expect(prompt).toContain('extremely handsome man')
  })
})

describe('generateImageUrl', () => {
  it('builds pollinations URL with encoded prompt', () => {
    const url = generateImageUrl('test prompt', { seed: 42, width: 512, height: 768 })
    expect(url).toContain('image.pollinations.ai/prompt/')
    expect(url).toContain('seed=42')
    expect(url).toContain('nologo=true')
  })

  it('returns distinct variation seeds', () => {
    const urls = generateVariationUrls('same prompt', 3)
    expect(urls).toHaveLength(3)
    expect(new Set(urls).size).toBe(3)
  })
})
