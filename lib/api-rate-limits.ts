import { getServiceRoleClient } from '@/lib/service-role'
import { serverLog } from '@/lib/server-log'
import {
  chatRateLimitExceededResponse,
  chatRateLimitUnavailableResponse,
} from '@/lib/chat-limits'

/** Rolling window default for most write caps (1 minute). */
export const API_RATE_LIMIT_WINDOW_MS = 60_000

export const API_RATE_LIMITS = {
  report: { max: 5, windowMs: 3_600_000 },
  character_create: { max: 10, windowMs: 86_400_000 },
  avatar_upload: { max: 20, windowMs: 3_600_000 },
  character_update: { max: 30, windowMs: API_RATE_LIMIT_WINDOW_MS },
  character_delete: { max: 10, windowMs: API_RATE_LIMIT_WINDOW_MS },
  character_fork: { max: 15, windowMs: 3_600_000 },
  character_like: { max: 60, windowMs: API_RATE_LIMIT_WINDOW_MS },
  persona_create: { max: 20, windowMs: 3_600_000 },
  persona_update: { max: 30, windowMs: API_RATE_LIMIT_WINDOW_MS },
  persona_delete: { max: 10, windowMs: API_RATE_LIMIT_WINDOW_MS },
  chat_create: { max: 20, windowMs: API_RATE_LIMIT_WINDOW_MS },
  chat_update: { max: 30, windowMs: API_RATE_LIMIT_WINDOW_MS },
  chat_delete: { max: 10, windowMs: API_RATE_LIMIT_WINDOW_MS },
  chat_clear_messages: { max: 10, windowMs: API_RATE_LIMIT_WINDOW_MS },
  message_update: { max: 30, windowMs: API_RATE_LIMIT_WINDOW_MS },
  message_delete: { max: 30, windowMs: API_RATE_LIMIT_WINDOW_MS },
  onboarding: { max: 5, windowMs: 3_600_000 },
  user_update: { max: 20, windowMs: API_RATE_LIMIT_WINDOW_MS },
  update_streak: { max: 5, windowMs: API_RATE_LIMIT_WINDOW_MS },
} as const

export type ApiRateLimitAction = keyof typeof API_RATE_LIMITS

const DEFAULT_MESSAGES: Partial<Record<ApiRateLimitAction, string>> = {
  report: 'Too many reports submitted. Please try again later.',
  character_create: 'Too many characters created. Please wait before creating more.',
  avatar_upload: 'Too many avatar uploads. Please wait before uploading again.',
  character_like: 'Too many like actions. Please slow down.',
  onboarding: 'Too many onboarding attempts. Please try again later.',
}

type RateLimitAdmin = {
  rpc: (
    fn: 'try_acquire_api_rate_slot',
    args: {
      p_user_id: string
      p_action: string
      p_max: number
      p_since: string
    }
  ) => PromiseLike<{ data: boolean | null; error: { message: string } | null }>
}

/** @internal test hook */
export type ApiRateLimitAdmin = RateLimitAdmin

/**
 * Records one write attempt in api_rate_events. Fails closed if the ledger RPC errors.
 * Uses service role internally — ledger tables are not exposed to authenticated JWTs.
 */
export async function assertApiRateLimit(
  userId: string,
  action: ApiRateLimitAction
): Promise<Response | null> {
  const admin = getServiceRoleClient()
  const { max, windowMs } = API_RATE_LIMITS[action]
  const since = new Date(Date.now() - windowMs).toISOString()

  const { data, error } = await admin.rpc('try_acquire_api_rate_slot', {
    p_user_id: userId,
    p_action: action,
    p_max: max,
    p_since: since,
  })

  if (error) {
    serverLog.error('api-rate-limit', `RPC error (${action})`, error)
    return chatRateLimitUnavailableResponse()
  }

  if (data !== true) {
    const retryAfterSec = Math.ceil(windowMs / 1000)
    const message =
      DEFAULT_MESSAGES[action] ??
      'Too many requests. Please wait before trying again.'
    return chatRateLimitExceededResponse(retryAfterSec, message)
  }

  return null
}

/** @deprecated Pass userId only — service role is resolved internally. */
export async function assertWriteApiRateLimit(
  userId: string,
  action: ApiRateLimitAction
): Promise<Response | null> {
  return assertApiRateLimit(userId, action)
}
