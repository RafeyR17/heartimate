import './load-env'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { hasIntegrationEnv, integrationSkipReason } from '@/lib/integration/env'
import {
  hasClerkIntegrationEnv,
  provisionIdorTestUsers,
  type ClerkTestUsers,
} from '@/lib/integration/clerk-test-users'
import {
  createIntegrationAdmin,
} from '@/lib/integration/clients'

const canRun =
  hasIntegrationEnv() && hasClerkIntegrationEnv()

if (!canRun) {
  describe.skip(`RLS IDOR integration — ${integrationSkipReason() || 'Missing CLERK_SECRET_KEY'}`, () => {
    it('skipped', () => {})
  })
} else {
  describe('RLS IDOR (live Supabase + Clerk JWT)', () => {
    let admin: SupabaseClient
    let users: ClerkTestUsers
    let chatIdB: string
    let messageIdB: string
    let characterIdB: string
    let rlsReady = false
    let skipReason = ''

    beforeAll(async () => {
      admin = createIntegrationAdmin()
      users = await provisionIdorTestUsers(admin)

      const probe = await users.clientA.from('users').select('id').limit(1)
      if (probe.error?.code === 'PGRST301') {
        skipReason =
          'Supabase rejects Clerk JWT — enable Clerk third-party auth (npm run auth:wire)'
        return
      }
      if (probe.error) {
        skipReason = probe.error.message
        return
      }
      rlsReady = true

      const { data: seedChar } = await admin
        .from('characters')
        .select('id, greeting')
        .eq('is_public', true)
        .limit(1)
        .maybeSingle()
      if (!seedChar) throw new Error('No public seed character for IDOR test')

      const { data: charB, error: charErr } = await users.clientB
        .from('characters')
        .insert({
          user_id: users.appUserB,
          name: 'IDOR Private B',
          description: 'test',
          personality: 'test',
          scenario: '',
          greeting: 'hi',
          example_dialogs: '',
          tags: [],
          is_public: false,
          is_nsfw: false,
        })
        .select('id')
        .single()
      if (charErr) throw charErr
      characterIdB = charB.id as string

      const { data: chatRow, error: chatErr } = await admin.rpc('create_chat_with_greeting', {
        p_user_id: users.appUserB,
        p_character_id: seedChar.id,
        p_persona_id: null,
        p_title: 'B chat',
        p_greeting: seedChar.greeting ?? 'hi',
      })
      if (chatErr) throw chatErr
      chatIdB = (chatRow as { chat_id: string }).chat_id

      const { data: msg, error: msgErr } = await admin
        .from('messages')
        .insert({ chat_id: chatIdB, role: 'user', content: 'secret' })
        .select('id')
        .single()
      if (msgErr) throw msgErr
      messageIdB = msg.id as string
    })

    afterAll(async () => {
      if (!admin || !rlsReady) return
      if (messageIdB) await admin.from('messages').delete().eq('id', messageIdB)
      if (chatIdB) {
        await admin.from('messages').delete().eq('chat_id', chatIdB)
        await admin.from('chats').delete().eq('id', chatIdB)
      }
      if (characterIdB) await admin.from('characters').delete().eq('id', characterIdB)
    })

    it('user A cannot read user B chat', async (ctx) => {
      if (!rlsReady) ctx.skip(skipReason || 'RLS not ready')
      const { data, error } = await users.clientA
        .from('chats')
        .select('id')
        .eq('id', chatIdB)
        .maybeSingle()
      expect(error).toBeNull()
      expect(data).toBeNull()
    })

    it('user A cannot read user B messages', async (ctx) => {
      if (!rlsReady) ctx.skip(skipReason || 'RLS not ready')
      const { data, error } = await users.clientA
        .from('messages')
        .select('id')
        .eq('chat_id', chatIdB)
      expect(error).toBeNull()
      expect(data ?? []).toHaveLength(0)
    })

    it('user A cannot read user B owned character', async (ctx) => {
      if (!rlsReady) ctx.skip(skipReason || 'RLS not ready')
      const { data, error } = await users.clientA
        .from('characters')
        .select('id')
        .eq('id', characterIdB)
        .maybeSingle()
      expect(error).toBeNull()
      expect(data).toBeNull()
    })

    it('user A delete_owned_message RPC returns not found for B message', async (ctx) => {
      if (!rlsReady) ctx.skip(skipReason || 'RLS not ready')
      const { data, error } = await users.clientA.rpc('delete_owned_message', {
        p_message_id: messageIdB,
        p_user_id: users.appUserA,
      })
      expect(error).toBeNull()
      expect((data as { ok?: boolean })?.ok).not.toBe(true)
    })

    it('user B can read own chat', async (ctx) => {
      if (!rlsReady) ctx.skip(skipReason || 'RLS not ready')
      const { data, error } = await users.clientB
        .from('chats')
        .select('id')
        .eq('id', chatIdB)
        .maybeSingle()
      expect(error).toBeNull()
      expect(data?.id).toBe(chatIdB)
    })
  })
}
