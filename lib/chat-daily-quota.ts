import type { SupabaseClient } from '@supabase/supabase-js'
import { FREE_DAILY_LIMIT } from '@/lib/quota-constants'
import { checkQuota, formatQuotaResetIn, type QuotaCheckResult } from '@/lib/quota'
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

export function userQuotaExceededResponse(resetAtIso: string): Response {
  const resetIn = formatQuotaResetIn(resetAtIso)
  return Response.json(
    {
      success: false,
      error: `You have used all ${FREE_DAILY_LIMIT} free messages today. Add your own API key for unlimited chats.`,
      code: 'quota_exceeded',
      remaining: 0,
      resetIn,
      upgradeUrl: '/settings',
      limit: FREE_DAILY_LIMIT,
    },
    {
      status: 429,
      headers: { 'Retry-After': String(Math.ceil(msUntilQuotaReset(resetAtIso) / 1000)) },
    }
  )
}

function msUntilQuotaReset(resetAtIso: string): number {
  const resetAt = new Date(resetAtIso)
  const next = resetAt.getTime() + 24 * 60 * 60 * 1000
  return Math.max(1, next - Date.now())
}

/**
 * Enforce daily message budget (users.daily_msg_count, 24h window).
 * BYOK and premium users skip. Env `CHAT_DAILY_MESSAGE_LIMIT=0|unlimited` disables cap.
 * Fail closed when quota state cannot be read.
 */
export type DailyQuotaGateResult =
  | { ok: true; quota: QuotaCheckResult }
  | { ok: false; response: Response }

export async function assertDailyChatQuota(
  userId: string,
  supabase?: SupabaseClient
): Promise<DailyQuotaGateResult> {
  const envLimit = resolveDailyChatLimit()
  const quota = await checkQuota(userId, supabase ? { supabase } : undefined)
  if (envLimit === null) {
    return { ok: true, quota }
  }
  if (quota.unavailable) {
    return { ok: false, response: dailyChatQuotaUnavailableResponse() }
  }
  if (quota.isByok || quota.isPremium || quota.allowed) {
    return { ok: true, quota }
  }
  return { ok: false, response: userQuotaExceededResponse(quota.resetAt) }
}

