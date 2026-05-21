import type { AuthedDb, AuthedDbUser } from '@/lib/authed-db'
import { createMockSupabaseClient } from '@/lib/test/mock-supabase'

export const TEST_USER: AuthedDbUser = {
  id: 'user-test-1',
  display_name: 'Test User',
  kink_prefs: [],
  avatar_url: null,
}

/** User A in IDOR matrix tests. */
export const IDOR_USER_A: AuthedDbUser = {
  id: 'user-a',
  display_name: 'User A',
  kink_prefs: [],
  avatar_url: null,
}

/** User B — resources belonging to B must not be reachable when authed as A. */
export const IDOR_USER_B: AuthedDbUser = {
  id: 'user-b',
  display_name: 'User B',
  kink_prefs: [],
  avatar_url: null,
}

export const IDOR_CHAT_B = 'chat-b-owned-by-b'
export const IDOR_MESSAGE_B = 'msg-b-owned-by-b'
export const IDOR_CHARACTER_B = 'char-b-owned-by-b'

export function mockAuthedDb(overrides: Partial<AuthedDb> = {}): AuthedDb {
  const empty = createMockSupabaseClient({})
  return {
    supabase: overrides.supabase ?? empty,
    user: overrides.user ?? TEST_USER,
    clerkId: overrides.clerkId ?? 'clerk_test_1',
  }
}
