import { getServiceRoleClient } from '@/lib/service-role'
import { serverLog } from '@/lib/server-log'

/** Max characters per user message sent to /api/chat. */
export const MAX_CHAT_MESSAGE_LENGTH = 4_000

/** Max JSON body size for chat POST (message + small metadata). */
export const MAX_CHAT_REQUEST_BODY_BYTES = 8_192

/** Every POST /api/chat (new message + regenerate + edit-resend) per rolling window. */
const parsedChatMax = parseInt(process.env.CHAT_API_RATE_LIMIT_MAX ?? '', 10)
export const CHAT_API_RATE_LIMIT_MAX =
  Number.isFinite(parsedChatMax) && parsedChatMax > 0 ? parsedChatMax : 30

/** Regenerate / omitUserPersist calls per rolling window. */
const parsedRegenMax = parseInt(process.env.CHAT_REGENERATE_RATE_LIMIT_MAX ?? '', 10)
export const CHAT_REGENERATE_RATE_LIMIT_MAX =
  Number.isFinite(parsedRegenMax) && parsedRegenMax > 0 ? parsedRegenMax : 5

/** Rolling window for chat rate limits (ms). */
export const CHAT_RATE_LIMIT_WINDOW_MS = 60_000

/** @deprecated Use CHAT_API_RATE_LIMIT_MAX */
export const CHAT_RATE_LIMIT_MAX = CHAT_API_RATE_LIMIT_MAX

export type ChatMessageValidation =
  | { ok: true; content: string }
  | { ok: false; error: string; status: number }

export function validateChatMessageContent(content: unknown): ChatMessageValidation {
  if (typeof content !== 'string') {
    return { ok: false, error: 'Message must be a string', status: 400 }
  }

  const trimmed = content.trim()
  if (!trimmed) {
    return { ok: false, error: 'Message cannot be empty', status: 400 }
  }

  if (trimmed.length > MAX_CHAT_MESSAGE_LENGTH) {
    return {
      ok: false,
      error: `Message exceeds ${MAX_CHAT_MESSAGE_LENGTH} characters`,
      status: 413,
    }
  }

  return { ok: true, content: trimmed }
}

export function chatRateLimitExceededResponse(
  retryAfterSec: number,
  message = 'Too many chat requests. Please wait before trying again.'
): Response {
  return Response.json(
    {
      error: message,
      success: false,
      retryAfter: retryAfterSec,
    },
    {
      status: 429,
      headers: { 'Retry-After': String(retryAfterSec) },
    }
  )
}

/** Fail closed when the rate-limit ledger cannot be checked. */
export function chatRateLimitUnavailableResponse(): Response {
  return Response.json(
    {
      error: 'Service temporarily unavailable',
      success: false,
    },
    { status: 503 }
  )
}

/**
 * Counts every POST /api/chat in chat_rate_events (not user message rows).
 * Regenerate / edit-resend (omitUserPersist) also hit a stricter per-minute cap.
 * Uses service role internally — ledger tables are not exposed to authenticated JWTs.
 */
export async function assertChatApiRateLimit(
  userId: string,
  opts?: { isRegenerate?: boolean }
): Promise<Response | null> {
  const supabase = getServiceRoleClient()
  const since = new Date(Date.now() - CHAT_RATE_LIMIT_WINDOW_MS).toISOString()
  const isRegenerate = opts?.isRegenerate === true

  const { data, error } = await supabase.rpc('try_acquire_chat_rate_slot', {
    p_user_id: userId,
    p_max: CHAT_API_RATE_LIMIT_MAX,
    p_since: since,
    p_is_regenerate: isRegenerate,
    p_regenerate_max: isRegenerate ? CHAT_REGENERATE_RATE_LIMIT_MAX : null,
    p_regenerate_since: isRegenerate ? since : null,
  })

  if (error) {
    serverLog.error('chat-rate-limit', 'RPC error', error)
    return chatRateLimitUnavailableResponse()
  }

  if (data !== true) {
    const retryAfterSec = Math.ceil(CHAT_RATE_LIMIT_WINDOW_MS / 1000)
    const message = isRegenerate
      ? 'Too many regenerations. Please wait before trying again.'
      : undefined
    return chatRateLimitExceededResponse(retryAfterSec, message)
  }

  return null
}

/** @deprecated Use assertChatApiRateLimit */
export const assertChatRateLimit = assertChatApiRateLimit
