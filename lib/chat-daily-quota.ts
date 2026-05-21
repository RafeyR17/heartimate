import { getServiceRoleClient } from '@/lib/service-role'
import { serverLog } from '@/lib/server-log'

/** Default free-tier cap when `CHAT_DAILY_MESSAGE_LIMIT` is unset (beta). */
export const CHAT_DAILY_MESSAGE_LIMIT_DEFAULT = 20

/**
 * Daily cap on POST /api/chat turns (each send + regenerate counts once).
 * `0` or `unlimited` = no cap. Unset env = {@link CHAT_DAILY_MESSAGE_LIMIT_DEFAULT}.
 */
export function resolveDailyChatLimit(): number | null {
  const raw = process.env.CHAT_DAILY_MESSAGE_LIMIT?.trim()
  if (!raw) return CHAT_DAILY_MESSAGE_LIMIT_DEFAULT
  if (raw === '0' || raw.toLowerCase() === 'unlimited') return null
  const n = parseInt(raw, 10)
  if (!Number.isFinite(n) || n < 0) return CHAT_DAILY_MESSAGE_LIMIT_DEFAULT
  if (n === 0) return null
  return n
}

/** UTC midnight for the current calendar day (ISO). */
export function startOfUtcDayIso(now = new Date()): string {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  ).toISOString()
}

/** Seconds until next UTC midnight (for Retry-After). */
export function secondsUntilUtcMidnight(now = new Date()): number {
  const next = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)
  )
  return Math.max(1, Math.ceil((next.getTime() - now.getTime()) / 1000))
}

export function dailyChatLimitExceededResponse(
  retryAfterSec: number,
  limit: number
): Response {
  return Response.json(
    {
      error: `You've used all ${limit} messages for today. They reset at midnight UTC.`,
      success: false,
      code: 'daily_chat_limit',
      retryAfter: retryAfterSec,
      limit,
    },
    {
      status: 429,
      headers: { 'Retry-After': String(retryAfterSec) },
    }
  )
}

export function dailyChatQuotaUnavailableResponse(): Response {
  return Response.json(
    {
      error: 'Service temporarily unavailable',
      success: false,
    },
    { status: 503 }
  )
}

/** Count chat_rate_events since UTC midnight (service role). */
export async function countChatTurnsSince(
  userId: string,
  sinceIso: string
): Promise<number | null> {
  const supabase = getServiceRoleClient()
  const { count, error } = await supabase
    .from('chat_rate_events')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', sinceIso)

  if (error) {
    serverLog.error('chat-daily-quota', 'count failed', error)
    return null
  }
  return count ?? 0
}

/**
 * Enforce daily message budget before acquiring a per-minute rate slot.
 * Fail closed when the ledger cannot be read.
 */
export async function assertDailyChatQuota(
  userId: string
): Promise<Response | null> {
  const limit = resolveDailyChatLimit()
  if (limit === null) return null

  const used = await countChatTurnsSince(userId, startOfUtcDayIso())
  if (used === null) return dailyChatQuotaUnavailableResponse()
  if (used >= limit) {
    return dailyChatLimitExceededResponse(secondsUntilUtcMidnight(), limit)
  }
  return null
}
