/**
 * Live API IDOR proof — real Clerk JWT + Supabase RLS (not mocked Supabase).
 * Skips until Supabase third-party auth accepts Clerk JWTs (no PGRST301).
 */
import './load-env'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { hasIntegrationEnv, integrationSkipReason } from '@/lib/integration/env'
import {
  hasClerkIntegrationEnv,
  provisionIdorTestUsers,
  type ClerkTestUsers,
} from '@/lib/integration/clerk-test-users'
import { createIntegrationAdmin } from '@/lib/integration/clients'
import { getServiceRoleClient } from '@/lib/service-role'
import { mockClerkAuth } from '@/lib/test/mock-clerk-auth'
import { jsonRequest, readJsonResponse } from '@/lib/test/route-helpers'

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}))

vi.mock('@/lib/llm', () => ({
  streamChat: vi.fn(),
}))

vi.mock('@/lib/posthog-server', () => ({
  getPostHogClient: () => ({ capture: vi.fn(), shutdown: vi.fn() }),
}))

import { GET as getChatMessages } from '@/app/api/chats/[chatId]/messages/route'
import { DELETE as deleteMessage } from '@/app/api/messages/[messageId]/route'
import { POST as postChat } from '@/app/api/chat/route'
import { DELETE as deleteChat } from '@/app/api/chats/[chatId]/route'
import { DELETE as deleteCharacter } from '@/app/api/characters/[id]/route'
import { DELETE as deletePersona } from '@/app/api/personas/[id]/route'

const canRun = hasIntegrationEnv() && hasClerkIntegrationEnv()

if (!canRun) {
  describe.skip(`API IDOR integration — ${integrationSkipReason() || 'Missing CLERK_SECRET_KEY'}`, () => {
    it('skipped', () => {})
  })
} else {
  describe('API IDOR (live routes + Clerk JWT + RLS)', () => {
    let admin: SupabaseClient
    let users: ClerkTestUsers
    let chatIdB: string
    let messageIdB: string
    let characterIdB: string
    let personaIdB: string
    let rlsReady = false
    let skipReason = ''

    beforeAll(async () => {
      vi.mocked(getServiceRoleClient).mockImplementation(() => createIntegrationAdmin())

      admin = createIntegrationAdmin()
      users = await provisionIdorTestUsers(admin)

      const probe = await users.clientA.from('users').select('id').limit(1)
      if (probe.error?.code === 'PGRST301') {
        skipReason =
          'Supabase rejects Clerk JWT — enable Clerk third-party auth (npm run auth:wire)'
        return
      }
      if (probe.error) throw probe.error
      rlsReady = true

      const { data: seedChar } = await admin
        .from('characters')
        .select('id, greeting')
        .eq('is_public', true)
        .limit(1)
        .maybeSingle()
      if (!seedChar) throw new Error('No public seed character for API IDOR test')

      const { data: chatRow, error: chatErr } = await admin.rpc('create_chat_with_greeting', {
        p_user_id: users.appUserB,
        p_character_id: seedChar.id,
        p_persona_id: null,
        p_title: 'API IDOR B chat',
        p_greeting: seedChar.greeting ?? 'hi',
      })
      if (chatErr) throw chatErr
      chatIdB = (chatRow as { chat_id: string }).chat_id

      const { data: msg, error: msgErr } = await admin
        .from('messages')
        .insert({ chat_id: chatIdB, role: 'user', content: 'secret from B' })
        .select('id')
        .single()
      if (msgErr) throw msgErr
      messageIdB = msg.id as string

      const { data: charRow, error: charErr } = await admin.from('characters').insert({
        user_id: users.appUserB,
        name: 'IDOR B Char',
        personality: 'test',
        greeting: 'hi',
      }).select('id').single()
      if (charErr) throw charErr
      characterIdB = charRow.id

      const { data: personaRow, error: perErr } = await admin.from('personas').insert({
        user_id: users.appUserB,
        name: 'IDOR B Persona',
      }).select('id').single()
      if (perErr) throw perErr
      personaIdB = personaRow.id

      mockClerkAuth(users.clerkA, users.tokenA)
    })

    afterAll(async () => {
      if (!admin || !rlsReady) return
      if (messageIdB) await admin.from('messages').delete().eq('id', messageIdB)
      if (chatIdB) {
        await admin.from('chats').delete().eq('id', chatIdB)
      }
      if (characterIdB) await admin.from('characters').delete().eq('id', characterIdB)
      if (personaIdB) await admin.from('personas').delete().eq('id', personaIdB)
    })

    it('GET /api/chats/{bChatId}/messages → 404 for user A', async (ctx) => {
      if (!rlsReady) ctx.skip(skipReason || 'RLS not ready')
      const res = await getChatMessages(
        new Request(`http://localhost/api/chats/${chatIdB}/messages`),
        { params: Promise.resolve({ chatId: chatIdB }) }
      )
      const { status, json } = await readJsonResponse(res)
      expect(status).toBe(404)
      expect(String(json.error)).toMatch(/Chat not found/i)
    })

    it('DELETE /api/messages/{bId} → 404 for user A', async (ctx) => {
      if (!rlsReady) ctx.skip(skipReason || 'RLS not ready')
      const res = await deleteMessage(
        new Request(`http://localhost/api/messages/${messageIdB}`, { method: 'DELETE' }),
        { params: Promise.resolve({ messageId: messageIdB }) }
      )
      const { status, json } = await readJsonResponse(res)
      expect(status).toBe(404)
      expect(String(json.error)).toMatch(/not found/i)
    })

    it('POST /api/chat with B chatId → 404 for user A', async (ctx) => {
      if (!rlsReady) ctx.skip(skipReason || 'RLS not ready')
      const res = await postChat(
        jsonRequest('http://localhost/api/chat', {
          chatId: chatIdB,
          content: 'IDOR probe',
        })
      )
      const { status, json } = await readJsonResponse(res)
      expect(status).toBe(404)
      expect(String(json.error)).toMatch(/Chat not found/i)
    })

    it('DELETE /api/chats/{bChatId} → 404 for user A', async (ctx) => {
      if (!rlsReady) ctx.skip(skipReason || 'RLS not ready')
      const res = await deleteChat(
        new Request(`http://localhost/api/chats/${chatIdB}`, { method: 'DELETE' }),
        { params: Promise.resolve({ chatId: chatIdB }) }
      )
      const { status, json } = await readJsonResponse(res)
      expect(status).toBe(404)
      expect(String(json.error)).toMatch(/not found/i)
    })

    it('DELETE /api/characters/{bCharId} → 404 for user A', async (ctx) => {
      if (!rlsReady) ctx.skip(skipReason || 'RLS not ready')
      const res = await deleteCharacter(
        new Request(`http://localhost/api/characters/${characterIdB}`, { method: 'DELETE' }),
        { params: Promise.resolve({ id: characterIdB }) }
      )
      const { status, json } = await readJsonResponse(res)
      expect(status).toBe(404)
      expect(String(json.error)).toMatch(/not found/i)
    })

    it('DELETE /api/personas/{bPersonaId} → 404 for user A', async (ctx) => {
      if (!rlsReady) ctx.skip(skipReason || 'RLS not ready')
      const res = await deletePersona(
        new Request(`http://localhost/api/personas/${personaIdB}`, { method: 'DELETE' }),
        { params: Promise.resolve({ id: personaIdB }) }
      )
      const { status, json } = await readJsonResponse(res)
      expect(status).toBe(404)
      expect(String(json.error)).toMatch(/not found/i)
    })
  })
}
