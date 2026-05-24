import { describe, expect, it } from 'vitest'
import { buildScenePrompt, generateChatImageUrl } from '@/lib/chat-imagegen'

describe('buildScenePrompt', () => {
  it('uses user request when provided', () => {
    const prompt = buildScenePrompt(
      { name: 'Seraph', tags: ['Romance'] },
      'smiling in moonlight',
      'friend'
    )
    expect(prompt).toContain('smiling in moonlight')
    expect(prompt).toContain('cinematic photography')
  })

  it('adds intimacy style from relationship level', () => {
    const prompt = buildScenePrompt(
      { name: 'Seraph', personality: 'She is warm', tags: ['Romance'] },
      null,
      'intimate'
    )
    expect(prompt).toContain('intimate pose')
  })
})

describe('generateChatImageUrl', () => {
  it('returns square pollinations URL', () => {
    const url = generateChatImageUrl('test', { seed: 1, width: 512, height: 512 })
    expect(url).toContain('image.pollinations.ai')
    expect(url).toContain('height=512')
    expect(url).toContain('model=flux')
  })
})
