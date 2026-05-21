/**
 * IDOR matrix — user A must not access user B's resources (404/401).
 * Uses mocked Supabase RLS behavior; run in CI via `npm run test:security`.
 * For live DB proof, extend tests/integration/ with two seeded users + JWTs.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { createMockSupabaseClient, createQueryChain } from '@/lib/test/mock-supabase'
import {
  IDOR_CHARACTER_B,
  IDOR_CHAT_B,
  IDOR_MESSAGE_B,
  IDOR_USER_A,
  mockAuthedDb,
} from '@/lib/test/mock-authed-db'
import { createIdorSupabaseUserA } from '@/lib/test/idor-helpers'
import { jsonRequest, readJsonResponse } from '@/lib/test/route-helpers'

const { createAuthedDb } = vi.hoisted(() => ({
  createAuthedDb: vi.fn(),
}))

vi.mock('@/lib/authed-db', () => ({
  createAuthedDb,
  createAuthedAdminDb: createAuthedDb,
}))

vi.mock('@/lib/llm', () => ({
  streamChat: vi.fn(),
}))

vi.mock('@/lib/posthog-server', () => ({
  getPostHogClient: () => ({ capture: vi.fn(), shutdown: vi.fn() }),
}))

vi.mock('@/lib/supabase-server', () => ({
  createSupabaseAnonClient: vi.fn(() =>
    createMockSupabaseClient({
      from: () =>
        createQueryChain(async () => ({
          data: [{ id: 'char-1', name: 'Lyra', greeting: 'Hi', avatar_url: null }],
          error: null,
        })),
    })
  ),
}))

import { GET as getChatMessages } from '@/app/api/chats/[chatId]/messages/route'
import { DELETE as deleteMessage } from '@/app/api/messages/[messageId]/route'
import { PATCH as patchCharacter } from '@/app/api/characters/[id]/route'
import { POST as postChat } from '@/app/api/chat/route'
import { GET as getOnboarding, POST as postOnboarding } from '@/app/api/onboarding/route'

function authedAsUserA() {
  createAuthedDb.mockResolvedValue(
    mockAuthedDb({
      user: IDOR_USER_A,
      clerkId: 'clerk-user-a',
      supabase: createIdorSupabaseUserA(),
    })
  )
}

describe('IDOR matrix', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('user A cannot GET user B chat messages → 404', async () => {
    authedAsUserA()
    const res = await getChatMessages(
      new Request(`http://localhost/api/chats/${IDOR_CHAT_B}/messages`),
      { params: Promise.resolve({ chatId: IDOR_CHAT_B }) }
    )
    const { status, json } = await readJsonResponse(res)
    expect(status).toBe(404)
    expect(json.error).toMatch(/Chat not found/i)
  })

  it('user A cannot DELETE user B message → 404', async () => {
    authedAsUserA()
    const res = await deleteMessage(
      new Request(`http://localhost/api/messages/${IDOR_MESSAGE_B}`, { method: 'DELETE' }),
      { params: Promise.resolve({ messageId: IDOR_MESSAGE_B }) }
    )
    const { status, json } = await readJsonResponse(res)
    expect(status).toBe(404)
    expect(json.error).toMatch(/not found/i)
  })

  it('user A cannot PATCH user B character → 404', async () => {
    authedAsUserA()
    const res = await patchCharacter(
      jsonRequest(`http://localhost/api/characters/${IDOR_CHARACTER_B}`, {
        isPublic: true,
      }, { method: 'PATCH' }),
      { params: Promise.resolve({ id: IDOR_CHARACTER_B }) }
    )
    const { status, json } = await readJsonResponse(res)
    expect(status).toBe(404)
    expect(json.error).toMatch(/Character not found/i)
  })

  it('user A cannot POST chat with user B chatId → 404', async () => {
    authedAsUserA()
    const res = await postChat(
      jsonRequest('http://localhost/api/chat', {
        chatId: IDOR_CHAT_B,
        content: 'Hello',
      }) as unknown as NextRequest
    )
    const { status, json } = await readJsonResponse(res)
    expect(status).toBe(404)
    expect(json.error).toMatch(/Chat not found/i)
  })

  it('unauthenticated POST /api/chat → 401', async () => {
    createAuthedDb.mockResolvedValue(null)
    const res = await postChat(
      jsonRequest('http://localhost/api/chat', {
        chatId: IDOR_CHAT_B,
        content: 'Hello',
      }) as unknown as NextRequest
    )
    expect((await readJsonResponse(res)).status).toBe(401)
  })

  it('unauthenticated POST /api/onboarding → 401', async () => {
    createAuthedDb.mockResolvedValue(null)
    const res = await postOnboarding(
      jsonRequest('http://localhost/api/onboarding', {
        displayName: 'Guest',
        starterCharId: 'char-1',
      })
    )
    expect((await readJsonResponse(res)).status).toBe(401)
  })

  it('authenticated POST /api/onboarding without isAdult → 400', async () => {
    authedAsUserA()
    const res = await postOnboarding(
      jsonRequest('http://localhost/api/onboarding', {
        displayName: 'Ada',
        starterCharId: 'char-1',
      })
    )
    const { status, json } = await readJsonResponse(res)
    expect(status).toBe(400)
    expect(json.success).toBe(false)
  })

  it('guest GET /api/onboarding → 200', async () => {
    createAuthedDb.mockResolvedValue(null)
    const res = await getOnboarding(new Request('http://localhost/api/onboarding'))
    const { status, json } = await readJsonResponse(res)
    expect(status).toBe(200)
    expect(json.success).toBe(true)
    expect(Array.isArray(json.starters)).toBe(true)
  })
})

describe('POST /api/chat maintenance', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
    vi.clearAllMocks()
  })

  it('returns 503 when CHAT_DISABLED=true', async () => {
    vi.stubEnv('CHAT_DISABLED', 'true')
    createAuthedDb.mockResolvedValue(mockAuthedDb())
    const res = await postChat(
      jsonRequest('http://localhost/api/chat', {
        chatId: 'chat-1',
        content: 'Hello',
      }) as unknown as NextRequest
    )
    const { status, json } = await readJsonResponse(res)
    expect(status).toBe(503)
    expect(json.error).toMatch(/temporarily unavailable/i)
  })
})
