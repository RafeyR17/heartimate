import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { decryptKey } from '@/lib/encryption'
import { getServiceRoleClient } from '@/lib/service-role'
import { OPENROUTER_CHAT_URL } from '@/lib/llm'
import { serverLog } from '@/lib/server-log'

export type ByokProvider = 'openrouter' | 'openai'

export type UserApiKeyResult = {
  apiKey: string
  provider: ByokProvider
  isByok: boolean
}

const OPENROUTER_VALIDATE_MODEL = 'deepseek/deepseek-chat'
const OPENAI_VALIDATE_MODEL = 'gpt-4o-mini'

function platformOpenRouterKey(): string | undefined {
  return process.env.OPENROUTER_API_KEY?.trim() || undefined
}

export function normalizeByokProvider(
  raw: string | null | undefined
): ByokProvider | null {
  const normalized = raw?.trim().toLowerCase()
  if (normalized === 'openrouter' || normalized === 'openai') {
    return normalized
  }
  return null
}

export function inferByokProviderFromApiKey(apiKey: string): ByokProvider | null {
  const key = apiKey.trim()
  if (key.startsWith('sk-or-')) return 'openrouter'
  if (key.startsWith('sk-')) return 'openai'
  return null
}

function resolvePlatformApiKey(): UserApiKeyResult {
  const fallback = platformOpenRouterKey()
  if (!fallback) {
    throw new Error('OPENROUTER_API_KEY is not configured')
  }
  return {
    apiKey: fallback,
    provider: 'openrouter',
    isByok: false,
  }
}

export async function getUserApiKey(
  userId: string,
  supabase?: SupabaseClient
): Promise<UserApiKeyResult> {
  const client = supabase ?? getServiceRoleClient()
  const { data: user, error } = await client
    .from('users')
    .select('byok_key_encrypted, byok_provider, is_byok')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    serverLog.warn('byok', 'fetch user row failed', {
      userId,
      message: error.message,
    })
  }

  if (user?.is_byok && user.byok_key_encrypted) {
    let apiKey: string
    try {
      apiKey = decryptKey(user.byok_key_encrypted).trim()
    } catch (decryptErr) {
      serverLog.error('byok', 'decrypt failed', {
        userId,
        message:
          decryptErr instanceof Error ? decryptErr.message : String(decryptErr),
      })
      const fallback = platformOpenRouterKey()
      if (!fallback) throw decryptErr
      serverLog.warn('byok', 'falling back to platform OpenRouter key after decrypt failure')
      return resolvePlatformApiKey()
    }

    if (!apiKey) {
      serverLog.error('byok', 'decrypted key was empty', { userId })
      const fallback = platformOpenRouterKey()
      if (!fallback) {
        throw new Error('BYOK key is empty')
      }
      return resolvePlatformApiKey()
    }

    const provider =
      normalizeByokProvider(user.byok_provider) ??
      inferByokProviderFromApiKey(apiKey) ??
      'openrouter'

    return {
      apiKey,
      provider,
      isByok: true,
    }
  }

  return resolvePlatformApiKey()
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
