import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { getServiceRoleClient } from '@/lib/service-role'
import { createMockSupabaseClient, createQueryChain } from '@/lib/test/mock-supabase'
import { mockAuthedDb } from '@/lib/test/mock-authed-db'
import { jsonRequest } from '@/lib/test/route-helpers'
import { buildOpenRouterChatRequestBody } from '@/lib/llm'

const { createAuthedDb, streamChat } = vi.hoisted(() => ({
  createAuthedDb: vi.fn(),
  streamChat: vi.fn(),
}))

vi.mock('@/lib/authed-db', () => ({
  createAuthedDb,
  createAuthedAdminDb: createAuthedDb,
}))

vi.mock('@/lib/llm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/llm')>()
  return {
    ...actual,
    streamChat,
    mergeChatAbortSignal: (signal?: AbortSignal | null) =>
      signal ?? new AbortController().signal,
  }
})

vi.mock('@/lib/posthog-server', () => ({
  getPostHogClient: () => ({ capture: vi.fn(), shutdown: vi.fn() }),
}))

vi.mock('@/lib/chat-moderation', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/chat-moderation')>()
  return {
    ...actual,
    moderateUserMessage: vi.fn(async () => ({ allowed: true })),
  }
})

import { POST } from './route'

const CHAT_CONTEXT = {
  ok: true,
  chat: {
    id: 'chat-1',
    user_id: 'user-test-1',
    persona_id: null,
    affection_score: 100,
    relationship_level: 'friend',
    total_messages: 4,
  },
  character: {
    id: 'char-1',
    name: 'Lyra',
    personality: 'warm',
    scenario: '',
    greeting: 'Hi',
    example_dialogs: '',
    tags: [],
    is_nsfw: true,
  },
  persona: null,
  messages: [
    { role: 'assistant', content: 'Hello' },
    { role: 'user', content: 'Before edit' },
  ],
  memory_summary: null,
}

function chatRequest(body: unknown, init: RequestInit = {}) {
  return jsonRequest('http://localhost/api/chat', body, init) as unknown as NextRequest
}

function supabaseForContract() {
  const messagesChain = createQueryChain(async () => ({
    data: { id: 'msg-user-new' },
    error: null,
  }))
  const client = createMockSupabaseClient({
    from: (table) => {
      if (table === 'messages') return messagesChain
      return createQueryChain(async () => ({ data: null, error: null }))
    },
    rpc: async (fn) => {
      if (fn === 'get_chat_turn_context') {
        return { data: CHAT_CONTEXT, error: null }
      }
      if (fn === 'finalize_chat_turn') {
        return { data: 'msg-asst-1', error: null }
      }
      if (fn === 'try_acquire_chat_rate_slot') {
        return { data: true, error: null }
      }
      return { data: true, error: null }
    },
  })
  return { client, messagesChain }
}

describe('POST /api/chat contract', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(streamChat).mockImplementation(async () => {
      const encoder = new TextEncoder()
      return new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode('Reply'))
          controller.close()
        },
      })
    })
    vi.mocked(getServiceRoleClient).mockImplementation(() =>
      createMockSupabaseClient({
        rpc: async () => ({ data: true, error: null }),
      })
    )
  })

  function payloadFromCall(index: number) {
    const call = vi.mocked(streamChat).mock.calls[index]
    if (!call) throw new Error('missing streamChat call')
    const [messages, systemPrompt, options] = call
    return buildOpenRouterChatRequestBody(messages, systemPrompt, options)
  }

  it('regenerate does not insert user row and ends history with user', async () => {
    const { client, messagesChain } = supabaseForContract()
    createAuthedDb.mockResolvedValue(mockAuthedDb({ supabase: client }))

    await POST(
      chatRequest({
        chatId: 'chat-1',
        content: 'Before edit',
        omitUserPersist: true,
      })
    )

    expect(vi.mocked(messagesChain.insert)).not.toHaveBeenCalled()
    expect(vi.mocked(streamChat)).toHaveBeenCalledTimes(1)
    const body = payloadFromCall(0)
    expect(body.messages[body.messages.length - 1]?.role).toBe('user')
    expect(body.messages[body.messages.length - 1]?.content).toContain('Before edit')
  })

  it('after edit uses same payload shape as regenerate', async () => {
    const { client } = supabaseForContract()
    createAuthedDb.mockResolvedValue(mockAuthedDb({ supabase: client }))

    await POST(
      chatRequest({
        chatId: 'chat-1',
        content: 'Before edit',
        omitUserPersist: true,
      })
    )
    await POST(
      chatRequest({
        chatId: 'chat-1',
        content: 'After edit',
        omitUserPersist: true,
      })
    )

    const regenBody = payloadFromCall(0)
    const editBody = payloadFromCall(1)
    expect(Object.keys(regenBody).sort()).toEqual(Object.keys(editBody).sort())
    expect(editBody.messages[editBody.messages.length - 1]?.content).toContain(
      'After edit'
    )
  })

  it('returns 503 on stream start failure and rolls back inserted user', async () => {
    vi.mocked(streamChat).mockRejectedValueOnce(new Error('OpenRouter down'))
    const { client, messagesChain } = supabaseForContract()
    createAuthedDb.mockResolvedValue(mockAuthedDb({ supabase: client }))

    const res = await POST(
      chatRequest({ chatId: 'chat-1', content: 'Hello' })
    )
    expect(res.status).toBe(503)
    expect(vi.mocked(messagesChain.delete)).toHaveBeenCalled()
    expect(vi.mocked(streamChat)).toHaveBeenCalledTimes(1)
  })

  it('idempotency replay does not call OpenRouter again', async () => {
    vi.mocked(getServiceRoleClient).mockImplementation(() =>
      createMockSupabaseClient({
        rpc: async (fn) => {
          if (fn === 'claim_chat_idempotency') {
            return { data: 'replay', error: null }
          }
          return { data: true, error: null }
        },
        from: (table) => {
          if (table === 'chat_idempotent_requests') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  response_body: 'Cached reply',
                  response_headers: { 'X-Special-Reply': 'false' },
                },
                error: null,
              }),
            }
          }
          return createQueryChain(async () => ({ data: null, error: null }))
        },
      })
    )
    const { client } = supabaseForContract()
    createAuthedDb.mockResolvedValue(mockAuthedDb({ supabase: client }))

    const res = await POST(
      chatRequest(
        { chatId: 'chat-1', content: 'Hello' },
        { headers: { 'Idempotency-Key': 'idem-key-12345678' } }
      )
    )
    expect(res.status).toBe(200)
    expect(await res.text()).toContain('Cached reply')
    expect(vi.mocked(streamChat)).not.toHaveBeenCalled()
  })
})
