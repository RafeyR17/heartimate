import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { FREE_DAILY_LIMIT } from '@/lib/quota-constants'
import { getServiceRoleClient } from '@/lib/service-role'
import { serverLog } from '@/lib/server-log'

export { FREE_DAILY_LIMIT }

const QUOTA_WINDOW_MS = 24 * 60 * 60 * 1000

export type QuotaCheckResult = {
  allowed: boolean
  remaining: number
  isReset: boolean
  isByok: boolean
  isPremium: boolean
  dailyCount: number
  resetAt: string
  /** True when quota state could not be loaded (fail closed). */
  unavailable?: boolean
}

type QuotaUserRow = {
  daily_msg_count: number | null
  msg_reset_at: string | null
  is_byok: boolean | null
  is_premium: boolean | null
}

function adminClient(): SupabaseClient {
  return getServiceRoleClient()
}

function hoursSince(iso: string, now: Date): number {
  const last = new Date(iso)
  if (Number.isNaN(last.getTime())) return QUOTA_WINDOW_MS
  return (now.getTime() - last.getTime()) / (1000 * 60 * 60)
}

export type CheckQuotaOptions = {
  /** Prefer JWT client (own `users` row via RLS) when service role is unset locally. */
  supabase?: SupabaseClient
}

export async function checkQuota(
  userId: string,
  opts?: CheckQuotaOptions
): Promise<QuotaCheckResult> {
  const now = new Date()
  let supabase = opts?.supabase
  if (!supabase) {
    try {
      supabase = adminClient()
    } catch (err) {
      serverLog.error('quota', 'service role not configured', err)
      return {
        allowed: false,
        remaining: 0,
        isReset: false,
        isByok: false,
        isPremium: false,
        dailyCount: 0,
        resetAt: now.toISOString(),
        unavailable: true,
      }
    }
  }

  const { data, error } = await supabase
    .from('users')
    .select('daily_msg_count, msg_reset_at, is_byok, is_premium')
    .eq('id', userId)
    .maybeSingle()

  if (error || !data) {
    serverLog.error('quota', 'fetch failed', { userId, message: error?.message })
    return {
      allowed: false,
      remaining: 0,
      isReset: false,
      isByok: false,
      isPremium: false,
      dailyCount: 0,
      resetAt: now.toISOString(),
      unavailable: true,
    }
  }

  const user = data as QuotaUserRow
  const resetAt = user.msg_reset_at ?? now.toISOString()

  if (user.is_byok) {
    return {
      allowed: true,
      remaining: -1,
      isReset: false,
      isByok: true,
      isPremium: Boolean(user.is_premium),
      dailyCount: user.daily_msg_count ?? 0,
      resetAt,
    }
  }

  if (user.is_premium) {
    return {
      allowed: true,
      remaining: -1,
      isReset: false,
      isByok: false,
      isPremium: true,
      dailyCount: user.daily_msg_count ?? 0,
      resetAt,
    }
  }

  let currentCount = user.daily_msg_count ?? 0
  let isReset = false
  let activeResetAt = resetAt

  if (hoursSince(resetAt, now) >= 24) {
    const nextReset = now.toISOString()
    const { error: resetError } = await supabase
      .from('users')
      .update({ daily_msg_count: 0, msg_reset_at: nextReset })
      .eq('id', userId)

    if (resetError) {
      serverLog.error('quota', 'reset failed', { userId, message: resetError.message })
    } else {
      currentCount = 0
      isReset = true
      activeResetAt = nextReset
    }
  }

  const remaining = Math.max(0, FREE_DAILY_LIMIT - currentCount)

  return {
    allowed: currentCount < FREE_DAILY_LIMIT,
    remaining,
    isReset,
    isByok: false,
    isPremium: false,
    dailyCount: currentCount,
    resetAt: activeResetAt,
  }
}

/** Bump free-tier daily count (no-op for BYOK / premium). */
export async function incrementQuota(
  userId: string,
  supabase: SupabaseClient
): Promise<void> {
  const { error } = await supabase.rpc('increment_message_count', {
    p_user_id: userId,
  })
  if (error) {
    serverLog.error('quota', 'increment failed', { userId, message: error.message })
  }
}

export function msUntilQuotaReset(resetAtIso: string, now = new Date()): number {
  const resetAt = new Date(resetAtIso)
  if (Number.isNaN(resetAt.getTime())) return QUOTA_WINDOW_MS
  const next = resetAt.getTime() + QUOTA_WINDOW_MS
  return Math.max(0, next - now.getTime())
}

export function formatQuotaResetIn(resetAtIso: string, now = new Date()): string {
  const ms = msUntilQuotaReset(resetAtIso, now)
  const hours = Math.floor(ms / (1000 * 60 * 60))
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
  if (hours > 0) return `${hours}h ${minutes}m`
  if (minutes > 0) return `${minutes}m`
  return 'soon'
}
