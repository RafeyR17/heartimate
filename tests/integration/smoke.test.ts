import './load-env'
import { beforeAll, describe, expect, it } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { hasIntegrationEnv, integrationSkipReason } from '@/lib/integration/env'
import {
  createIntegrationAdmin,
  createIntegrationAnon,
} from '@/lib/integration/clients'

if (!hasIntegrationEnv()) {
  describe.skip(`Supabase integration smoke — ${integrationSkipReason()}`, () => {
    it('skipped', () => {})
  })
} else {
  describe('Supabase integration smoke', () => {
    let admin: SupabaseClient
    let anon: SupabaseClient

    beforeAll(() => {
      admin = createIntegrationAdmin()
      anon = createIntegrationAnon()
    })

    it('anon can read public characters', async () => {
      const { data, error } = await anon
        .from('characters')
        .select('id, name, is_public')
        .eq('is_public', true)
        .limit(5)

      expect(error).toBeNull()
      expect(Array.isArray(data)).toBe(true)
    })

    it('explore_public_characters_random RPC works for anon', async () => {
      const { data, error } = await anon.rpc('explore_public_characters_random', {
        p_limit: 3,
        p_search: null,
        p_tags: null,
      })

      expect(error).toBeNull()
      expect(Array.isArray(data)).toBe(true)
    })

    it('try_acquire_api_rate_slot enforces cap via service role', async () => {
      const userId = `hm-integ-${Date.now()}`
      const action = `integration_test_${Date.now()}`

      await admin.from('users').insert({
        id: userId,
        clerk_id: `clerk_${userId}`,
        display_name: 'Integration Test',
      })

      const since = new Date(Date.now() - 60_000).toISOString()

      const first = await admin.rpc('try_acquire_api_rate_slot', {
        p_user_id: userId,
        p_action: action,
        p_max: 1,
        p_since: since,
      })
      expect(first.error).toBeNull()
      expect(first.data).toBe(true)

      const second = await admin.rpc('try_acquire_api_rate_slot', {
        p_user_id: userId,
        p_action: action,
        p_max: 1,
        p_since: since,
      })
      expect(second.error).toBeNull()
      expect(second.data).toBe(false)

      await admin.from('api_rate_events').delete().eq('user_id', userId)
      await admin.from('users').delete().eq('id', userId)
    })

    it('create_chat_with_greeting creates chat and greeting message', async () => {
      const { data: seedChar } = await admin
        .from('characters')
        .select('id, greeting')
        .eq('is_public', true)
        .limit(1)
        .maybeSingle()

      if (!seedChar) {
        return
      }

      const userId = `hm-integ-chat-${Date.now()}`
      await admin.from('users').insert({
        id: userId,
        clerk_id: `clerk_${userId}`,
        display_name: 'Chat Integration',
      })

      const { data, error } = await admin.rpc('create_chat_with_greeting', {
        p_user_id: userId,
        p_character_id: seedChar.id,
        p_persona_id: null,
        p_title: 'Integration chat',
        p_greeting: seedChar.greeting ?? 'Hello',
      })

      expect(error).toBeNull()
      const chatId = (data as { chat_id?: string } | null)?.chat_id
      expect(chatId).toBeTruthy()

      const { count } = await admin
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('chat_id', chatId!)

      expect((count ?? 0) >= 1).toBe(true)

      await admin.from('messages').delete().eq('chat_id', chatId!)
      await admin.from('chats').delete().eq('id', chatId!)
      await admin.from('users').delete().eq('id', userId)
    })
  })
}
