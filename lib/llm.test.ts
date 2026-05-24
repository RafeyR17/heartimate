import { afterEach, describe, expect, it } from 'vitest'
import {
  OPENROUTER_CHAT_URL,
  OPENROUTER_MODEL_DEFAULT,
  openRouterRequestHeaders,
  resolveChatCompletionsRequest,
  resolveChatGenerationParams,
  resolveChatModel,
  resolveChatModelCandidates,
  resolveMemoryModel,
} from '@/lib/llm'

const ENV_KEYS = [
  'OPENROUTER_API_KEY',
  'OPENROUTER_MODEL',
  'OPENROUTER_MODEL_FALLBACK',
  'OPENROUTER_MODEL_NSFW',
  'OPENROUTER_MEMORY_MODEL',
  'OPENROUTER_MAX_TOKENS',
  'OPENROUTER_MAX_TOKENS_SFW',
  'OPENROUTER_MAX_TOKENS_NSFW',
  'OPENROUTER_TEMPERATURE',
  'OPENROUTER_TEMPERATURE_SFW',
  'OPENROUTER_TEMPERATURE_NSFW',
  'OPENROUTER_FREQUENCY_PENALTY',
  'OPENROUTER_FREQUENCY_PENALTY_SFW',
  'OPENROUTER_FREQUENCY_PENALTY_NSFW',
] as const

afterEach(() => {
  for (const key of ENV_KEYS) {
    delete process.env[key]
  }
})

describe('resolveChatCompletionsRequest', () => {
  it('uses explicit BYOK key in Authorization without env fallback', () => {
    process.env.OPENROUTER_API_KEY = 'sk-or-platform-should-not-be-used'
    const byokKey = 'sk-or-v1-user-key-abcdef'
    const { url, headers } = resolveChatCompletionsRequest({
      apiKey: byokKey,
      provider: 'openrouter',
    })
    expect(url).toBe(OPENROUTER_CHAT_URL)
    expect(headers.Authorization).toBe(`Bearer ${byokKey}`)
  })

  it('does not substitute env key when explicit apiKey is empty', () => {
    process.env.OPENROUTER_API_KEY = 'sk-or-platform'
    expect(() =>
      resolveChatCompletionsRequest({
        apiKey: '   ',
        provider: 'openrouter',
      })
    ).toThrow('OpenRouter API key is required')
  })

  it('falls back to env when apiKey is omitted', () => {
    process.env.OPENROUTER_API_KEY = 'sk-or-platform-key'
    const headers = openRouterRequestHeaders()
    expect(headers.Authorization).toBe('Bearer sk-or-platform-key')
  })
})

describe('resolveChatModel', () => {
  it('uses default when env unset', () => {
    expect(resolveChatModel(false)).toBe(OPENROUTER_MODEL_DEFAULT)
    expect(resolveChatModel(true)).toBe(OPENROUTER_MODEL_DEFAULT)
  })

  it('uses OPENROUTER_MODEL for all chats when NSFW model unset', () => {
    process.env.OPENROUTER_MODEL = 'custom/sfw-model'
    expect(resolveChatModel(false)).toBe('custom/sfw-model')
    expect(resolveChatModel(true)).toBe('custom/sfw-model')
  })

  it('uses OPENROUTER_MODEL_NSFW only when is_nsfw and set', () => {
    process.env.OPENROUTER_MODEL = 'custom/sfw-model'
    process.env.OPENROUTER_MODEL_NSFW = 'custom/nsfw-model'
    expect(resolveChatModel(false)).toBe('custom/sfw-model')
    expect(resolveChatModel(true)).toBe('custom/nsfw-model')
  })

  it('ignores whitespace-only OPENROUTER_MODEL_NSFW', () => {
    process.env.OPENROUTER_MODEL = 'custom/sfw-model'
    process.env.OPENROUTER_MODEL_NSFW = '   '
    expect(resolveChatModel(true)).toBe('custom/sfw-model')
  })
})

describe('resolveChatModelCandidates', () => {
  it('appends fallback slugs without duplicates', () => {
    process.env.OPENROUTER_MODEL = 'primary/model'
    process.env.OPENROUTER_MODEL_FALLBACK = 'backup/a, backup/b, primary/model'
    expect(resolveChatModelCandidates(false)).toEqual([
      'primary/model',
      'backup/a',
      'backup/b',
    ])
  })
})

describe('resolveMemoryModel', () => {
  it('defaults to chat default model', () => {
    expect(resolveMemoryModel()).toBe(OPENROUTER_MODEL_DEFAULT)
  })

  it('uses OPENROUTER_MEMORY_MODEL when set', () => {
    process.env.OPENROUTER_MEMORY_MODEL = 'memory/model'
    expect(resolveMemoryModel()).toBe('memory/model')
  })
})

describe('resolveChatGenerationParams', () => {
  it('applies SFW defaults', () => {
    expect(resolveChatGenerationParams(false)).toEqual({
      max_tokens: 1000,
      temperature: 0.85,
      presence_penalty: 0.6,
      frequency_penalty: 0.3,
    })
  })

  it('applies NSFW defaults (longer, warmer, less repetition)', () => {
    expect(resolveChatGenerationParams(true)).toEqual({
      max_tokens: 1350,
      temperature: 0.92,
      presence_penalty: 0.6,
      frequency_penalty: 0.2,
    })
  })

  it('respects per-mode env overrides', () => {
    process.env.OPENROUTER_MAX_TOKENS_NSFW = '1500'
    process.env.OPENROUTER_TEMPERATURE_SFW = '0.8'
    expect(resolveChatGenerationParams(true).max_tokens).toBe(1500)
    expect(resolveChatGenerationParams(false).temperature).toBe(0.8)
  })

  it('falls back OPENROUTER_MAX_TOKENS to SFW only', () => {
    process.env.OPENROUTER_MAX_TOKENS = '900'
    expect(resolveChatGenerationParams(false).max_tokens).toBe(900)
    expect(resolveChatGenerationParams(true).max_tokens).toBe(1350)
  })
})
