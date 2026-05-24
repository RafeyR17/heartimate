import 'server-only'
import { decryptKey } from '@/lib/encryption'
import { getServiceRoleClient } from '@/lib/service-role'
import { OPENROUTER_CHAT_URL } from '@/lib/llm'

export type ByokProvider = 'openrouter' | 'openai'

export type UserApiKeyResult = {
  apiKey: string
  provider: ByokProvider
  isByok: boolean
}

const OPENROUTER_VALIDATE_MODEL = 'deepseek/deepseek-chat'
const OPENAI_VALIDATE_MODEL = 'gpt-4o-mini'

export async function getUserApiKey(userId: string): Promise<UserApiKeyResult> {
  const { data: user, error } = await getServiceRoleClient()
    .from('users')
    .select('byok_key_encrypted, byok_provider, is_byok')
    .eq('id', userId)
    .maybeSingle()

  if (
    !error &&
    user?.is_byok &&
    user.byok_key_encrypted &&
    (user.byok_provider === 'openrouter' || user.byok_provider === 'openai')
  ) {
    return {
      apiKey: decryptKey(user.byok_key_encrypted),
      provider: user.byok_provider,
      isByok: true,
    }
  }

  const fallback = process.env.OPENROUTER_API_KEY?.trim()
  if (!fallback) {
    throw new Error('OPENROUTER_API_KEY is not configured')
  }

  return {
    apiKey: fallback,
    provider: 'openrouter',
    isByok: false,
  }
}

export function chatCompletionsUrl(provider: ByokProvider): string {
  return provider === 'openai'
    ? 'https://api.openai.com/v1/chat/completions'
    : OPENROUTER_CHAT_URL
}

export function resolveProviderModel(
  provider: ByokProvider,
  model?: string
): string {
  if (provider === 'openai') return 'gpt-4o-mini'
  return model ?? OPENROUTER_VALIDATE_MODEL
}

export async function validateApiKey(
  key: string,
  provider: ByokProvider
): Promise<boolean> {
  try {
    const url = chatCompletionsUrl(provider)
    const model =
      provider === 'openai' ? OPENAI_VALIDATE_MODEL : OPENROUTER_VALIDATE_MODEL

    const headers: Record<string, string> = {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    }
    if (provider === 'openrouter') {
      headers['HTTP-Referer'] =
        process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      headers['X-Title'] = 'Heartimate'
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 5,
      }),
      signal: AbortSignal.timeout(20_000),
    })

    return response.ok || response.status === 400
  } catch {
    return false
  }
}

/** Mask key for UI preview (never send full key to client). */
export function maskApiKey(provider: ByokProvider, keyPrefix?: string | null): string {
  if (!keyPrefix) {
    return provider === 'openrouter' ? 'sk-or-••••••••••••' : 'sk-••••••••••••'
  }
  return `${keyPrefix}••••••••••••`
}
