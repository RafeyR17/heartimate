import type { SupabaseClient } from '@supabase/supabase-js'
import { serverLog } from '@/lib/server-log'

/**
 * Daily login streak — call with the authenticated RLS Supabase client.
 */
export type StreakUpdateResult = {
  newStreak: number
  isNewRecord: boolean
  changed: boolean
}

function isMissingStreakSchema(err: {
  message?: string
  code?: string
  details?: string
} | null): boolean {
  if (!err) return false
  const text = `${err.message ?? ''} ${err.details ?? ''}`.toLowerCase()
  // Postgres undefined_column; PostgREST sometimes surfaces this in message only
  if (err.code === '42703') return true
  if (text.includes('streak_count') && text.includes('does not exist')) return true
  if (text.includes('last_streak_date') && text.includes('does not exist')) return true
  if (text.includes('longest_streak') && text.includes('does not exist')) return true
  return false
}

export async function updateStreak(
  userId: string,
  supabase: SupabaseClient
): Promise<StreakUpdateResult | null> {
  const { data: user, error } = await supabase
    .from('users')
    .select('streak_count, last_streak_date, longest_streak')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    if (isMissingStreakSchema(error)) return null
    const msg = [error.code, error.message, error.details].filter(Boolean).join(' — ')
    serverLog.error('updateStreak', msg || 'unknown error', error)
    return null
  }

  // No row matched (or empty result) — silent, not a server failure
  if (!user) return null

  const today = new Date().toISOString().split('T')[0]!
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]!

  const last = user.last_streak_date as string | null

  // Already updated today
  if (last === today) {
    return {
      newStreak: user.streak_count ?? 0,
      isNewRecord: false,
      changed: false,
    }
  }

  let newStreak = 1

  if (last === yesterday) {
    newStreak = (user.streak_count ?? 0) + 1
  }

  const prevLongest = user.longest_streak ?? 0
  const newLongest = Math.max(newStreak, prevLongest)

  await supabase
    .from('users')
    .update({
      streak_count: newStreak,
      last_streak_date: today,
      longest_streak: newLongest,
    })
    .eq('id', userId)

  return {
    newStreak,
    isNewRecord: newStreak > prevLongest && newStreak === newLongest,
    changed: true,
  }
}

