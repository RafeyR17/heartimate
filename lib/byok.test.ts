import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { encryptKey } from '@/lib/encryption'
import { getUserApiKey } from '@/lib/byok'
import { getServiceRoleClient } from '@/lib/service-role'
import { createMockSupabaseClient, createQueryChain } from '@/lib/test/mock-supabase'

vi.mock('@/lib/service-role', () => ({
  getServiceRoleClient: vi.fn(),
}))

const ENCRYPTION_SECRET = 'test-secret-at-least-16-chars'
const PLATFORM_KEY = 'sk-or-platform-key-12345678'
const USER_KEY = 'sk-or-v1-user-byok-key-99'

function mockUserRow(overrides: Record<string, unknown> = {}) {
  vi.mocked(getServiceRoleClient).mockReturnValue(
    createMockSupabaseClient({
      from: () =>
        createQueryChain(async () => ({
          data: {
            is_byok: true,
            byok_provider: 'openrouter',
            byok_key_encrypted: encryptKey(USER_KEY),
            ...overrides,
          },
          error: null,
        })),
    })
  )
}

describe('getUserApiKey', () => {
  beforeEach(() => {
    vi.stubEnv('ENCRYPTION_SECRET', ENCRYPTION_SECRET)
    vi.stubEnv('OPENROUTER_API_KEY', PLATFORM_KEY)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.clearAllMocks()
  })

  it('returns decrypted BYOK key for openrouter users', async () => {
    mockUserRow()
    const result = await getUserApiKey('user-1')
    expect(result).toEqual({
      apiKey: USER_KEY,
      provider: 'openrouter',
      isByok: true,
    })
  })

  it('normalizes provider casing and whitespace', async () => {
    mockUserRow({ byok_provider: ' OpenRouter ' })
    const result = await getUserApiKey('user-1')
    expect(result.isByok).toBe(true)
    expect(result.provider).toBe('openrouter')
    expect(result.apiKey).toBe(USER_KEY)
  })

  it('infers openrouter provider when missing but key is sk-or-', async () => {
    mockUserRow({ byok_provider: null })
    const result = await getUserApiKey('user-1')
    expect(result.provider).toBe('openrouter')
    expect(result.apiKey).toBe(USER_KEY)
  })

  it('falls back to platform key when decrypt fails', async () => {
    mockUserRow({ byok_key_encrypted: 'not-valid-ciphertext' })
    const result = await getUserApiKey('user-1')
    expect(result).toEqual({
      apiKey: PLATFORM_KEY,
      provider: 'openrouter',
      isByok: false,
    })
  })

  it('uses platform key for non-BYOK users', async () => {
    mockUserRow({
      is_byok: false,
      byok_key_encrypted: null,
      byok_provider: null,
    })
    const result = await getUserApiKey('user-1')
    expect(result).toEqual({
      apiKey: PLATFORM_KEY,
      provider: 'openrouter',
      isByok: false,
    })
  })
})
