import type { SupabaseClient } from '@supabase/supabase-js'
import { API_ERROR_CODES, type ApiErrorCode } from '@/lib/api-error-codes'
import { serverLog } from '@/lib/server-log'

export type MessageRpcResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: 'not_found' | 'forbidden' | 'not_user_message' | 'rpc_error' }

type RpcErrorCode = 'not_found' | 'forbidden' | 'not_user_message' | 'rpc_error'

type RpcPayload = {
  ok?: boolean
  error?: string
  message?: unknown
  deleted?: boolean
  empty?: boolean
  greeting?: Record<string, unknown> | null
}

function mapRpcError(code: string | undefined): RpcErrorCode {
  if (code === 'not_found' || code === 'forbidden' || code === 'not_user_message') {
    return code
  }
  return 'rpc_error'
}

export async function patchUserMessage(
  supabase: SupabaseClient,
  userId: string,
  messageId: string,
  content: string,
  truncateAfter: boolean
): Promise<
  MessageRpcResult<{
    id: string
    role: string
    content: string
    created_at: string
  }>
> {
  const { data, error } = await supabase.rpc('patch_user_message', {
    p_message_id: messageId,
    p_user_id: userId,
    p_content: content,
    p_truncate_after: truncateAfter,
  })

  if (error) {
    serverLog.error('patch_user_message', 'RPC error', error)
    return { ok: false, error: 'rpc_error' }
  }

  const payload = data as RpcPayload | null
  if (!payload?.ok) {
    return { ok: false, error: mapRpcError(payload?.error) }
  }

  const message = payload.message as {
    id: string
    role: string
    content: string
    created_at: string
  }
  return { ok: true, data: message }
}

export async function deleteOwnedMessage(
  supabase: SupabaseClient,
  userId: string,
  messageId: string
): Promise<MessageRpcResult<{ deleted: true }>> {
  const { data, error } = await supabase.rpc('delete_owned_message', {
    p_message_id: messageId,
    p_user_id: userId,
  })

  if (error) {
    serverLog.error('delete_owned_message', 'RPC error', error)
    return { ok: false, error: 'rpc_error' }
  }

  const payload = data as RpcPayload | null
  if (!payload?.ok) {
    return { ok: false, error: mapRpcError(payload?.error) }
  }

  return { ok: true, data: { deleted: true } }
}

export async function resetChatMessages(
  supabase: SupabaseClient,
  userId: string,
  chatId: string,
  opts: { greeting?: string | null; emptyOnly?: boolean }
): Promise<
  MessageRpcResult<{
    empty?: boolean
    greeting: Record<string, unknown> | null
  }>
> {
  const { data, error } = await supabase.rpc('reset_chat_messages', {
    p_chat_id: chatId,
    p_user_id: userId,
    p_greeting: opts.greeting ?? null,
    p_empty_only: opts.emptyOnly === true,
  })

  if (error) {
    serverLog.error('reset_chat_messages', 'RPC error', error)
    return { ok: false, error: 'rpc_error' }
  }

  const payload = data as RpcPayload | null
  if (!payload?.ok) {
    return { ok: false, error: mapRpcError(payload?.error) }
  }

  return {
    ok: true,
    data: {
      empty: payload.empty === true,
      greeting: (payload.greeting as Record<string, unknown> | null) ?? null,
    },
  }
}

export function messageRpcToHttp(
  result: MessageRpcResult<unknown>
): { status: number; message: string; code: ApiErrorCode } | null {
  if (result.ok) return null
  switch (result.error) {
    case 'not_found':
      return {
        status: 404,
        message: 'Message not found',
        code: API_ERROR_CODES.MESSAGE_NOT_FOUND,
      }
    case 'forbidden':
      return {
        status: 403,
        message: 'Forbidden',
        code: API_ERROR_CODES.FORBIDDEN,
      }
    case 'not_user_message':
      return {
        status: 400,
        message: 'Only user messages can be edited',
        code: API_ERROR_CODES.BAD_REQUEST,
      }
    default:
      return {
        status: 500,
        message: 'Database error',
        code: API_ERROR_CODES.INTERNAL_ERROR,
      }
  }
}
