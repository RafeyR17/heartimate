import type { AuthedDbUser } from '@/lib/authed-db'
import { createMockSupabaseClient, createQueryChain } from '@/lib/test/mock-supabase'
import {
  IDOR_CHARACTER_B,
  IDOR_CHAT_B,
  IDOR_MESSAGE_B,
  IDOR_USER_A,
  IDOR_USER_B,
} from '@/lib/test/mock-authed-db'

/**
 * Simulates RLS: resources exist for user B but return empty when queried as another user.
 * Handlers mirror `.eq('user_id', callerId)` ownership checks in API routes.
 */
export function createIdorSupabaseAsUser(caller: AuthedDbUser) {
  return createMockSupabaseClient({
    from: (table) => {
      if (table === 'chats') {
        return createQueryChain(async () => {
          if (caller.id === IDOR_USER_B.id) {
            return {
              data: {
                id: IDOR_CHAT_B,
                user_id: IDOR_USER_B.id,
                persona_id: null,
                affection_score: 0,
                relationship_level: 'stranger',
                total_messages: 0,
                characters: {
                  id: 'char-1',
                  name: 'Lyra',
                  personality: 'warm',
                  scenario: '',
                  greeting: 'Hi',
                  example_dialogs: '',
                  tags: [],
                  is_nsfw: false,
                },
                persona: null,
              },
              error: null,
            }
          }
          return { data: null, error: null }
        })
      }
      if (table === 'characters') {
        return createQueryChain(async () => {
          if (caller.id === IDOR_USER_B.id) {
            return {
              data: {
                id: IDOR_CHARACTER_B,
                user_id: IDOR_USER_B.id,
                is_public: false,
                name: 'Private B',
              },
              error: null,
            }
          }
          return { data: null, error: null }
        })
      }
      if (table === 'messages') {
        return createQueryChain(async () => ({ data: [], error: null }))
      }
      if (table === 'chat_memory') {
        return createQueryChain(async () => ({ data: null, error: null }))
      }
      return createQueryChain(async () => ({ data: null, error: null }))
    },
    rpc: async (fn, args) => {
      if (fn === 'delete_owned_message' || fn === 'patch_user_message') {
        const ownerId = args.p_user_id as string
        const messageId = args.p_message_id as string
        if (ownerId !== IDOR_USER_B.id || messageId !== IDOR_MESSAGE_B) {
          return { data: { ok: false, error: 'not_found' }, error: null }
        }
        return { data: { ok: true, deleted: true }, error: null }
      }
      return { data: true, error: null }
    },
  })
}

/** Supabase client for user A attempting to access user B resources (RLS denies). */
export function createIdorSupabaseUserA() {
  return createIdorSupabaseAsUser(IDOR_USER_A)
}
