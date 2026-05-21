import { apiError, streamTextResponse } from '@/lib/api'
import { chatRateLimitUnavailableResponse } from '@/lib/chat-limits'
import { getApiRequestId } from '@/lib/observability/request-context'
import { getServiceRoleClient } from '@/lib/service-role'
import { serverLog } from '@/lib/server-log'

export const IDEMPOTENCY_KEY_MAX_LENGTH = 128
const STALE_PROCESSING_SECONDS = 120

export type IdempotencyClaimResult =
  | { action: 'proceed' }
  | { action: 'replay'; body: string; headers: Record<string, string> }
  | { action: 'in_progress'; response: Response }
  | { action: 'unavailable'; response: Response }

export function normalizeIdempotencyKey(raw: string | null): string | null {
  if (!raw) return null
  const key = raw.trim().slice(0, IDEMPOTENCY_KEY_MAX_LENGTH)
  if (!key || !/^[a-zA-Z0-9_-]{8,128}$/.test(key)) return null
  return key
}

export function idempotencyUnavailableResponse(): Response {
  return chatRateLimitUnavailableResponse()
}

export async function claimChatIdempotency(
  userId: string,
  chatId: string,
  idempotencyKey: string
): Promise<IdempotencyClaimResult> {
  const db = getServiceRoleClient()
  const { data, error } = await db.rpc('claim_chat_idempotency', {
    p_user_id: userId,
    p_idempotency_key: idempotencyKey,
    p_chat_id: chatId,
    p_stale_after_seconds: STALE_PROCESSING_SECONDS,
  })

  if (error) {
    serverLog.error('chat-idempotency', 'claim error', error)
    return { action: 'unavailable', response: idempotencyUnavailableResponse() }
  }

  if (data === 'replay') {
    const cached = await getCompletedIdempotency(userId, idempotencyKey)
    if (cached) {
      return { action: 'replay', body: cached.body, headers: cached.headers }
    }
    serverLog.error('chat-idempotency', 'replay without cached body', { idempotencyKey })
    return { action: 'unavailable', response: idempotencyUnavailableResponse() }
  }

  if (data === 'in_progress') {
    return {
      action: 'in_progress',
      response: apiError('Duplicate chat request still processing', 409),
    }
  }

  return { action: 'proceed' }
}

async function getCompletedIdempotency(
  userId: string,
  idempotencyKey: string
): Promise<{ body: string; headers: Record<string, string> } | null> {
  const db = getServiceRoleClient()
  const { data, error } = await db
    .from('chat_idempotent_requests')
    .select('response_body, response_headers')
    .eq('user_id', userId)
    .eq('idempotency_key', idempotencyKey)
    .eq('status', 'completed')
    .maybeSingle()

  if (error) {
    serverLog.error('chat-idempotency', 'fetch completed error', error)
    return null
  }

  if (!data?.response_body) return null

  const headers =
    data.response_headers && typeof data.response_headers === 'object'
      ? (data.response_headers as Record<string, string>)
      : {}

  return { body: data.response_body as string, headers }
}

export function replayIdempotentChatResponse(
  body: string,
  headers: Record<string, string>
): Response {
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(body))
      controller.close()
    },
  })
  return streamTextResponse(stream, headers, {
    requestId: getApiRequestId(),
  })
}

export async function completeChatIdempotency(
  userId: string,
  idempotencyKey: string,
  body: string,
  headers: Record<string, string>
): Promise<void> {
  const db = getServiceRoleClient()
  const { error } = await db.rpc('complete_chat_idempotency', {
    p_user_id: userId,
    p_idempotency_key: idempotencyKey,
    p_response_body: body,
    p_response_headers: headers,
  })
  if (error) {
    serverLog.error('chat-idempotency', 'complete error', error)
  }
}

export async function failChatIdempotency(
  userId: string,
  idempotencyKey: string
): Promise<void> {
  const db = getServiceRoleClient()
  const { error } = await db.rpc('fail_chat_idempotency', {
    p_user_id: userId,
    p_idempotency_key: idempotencyKey,
  })
  if (error) {
    serverLog.error('chat-idempotency', 'fail error', error)
  }
}
