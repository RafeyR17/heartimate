import { withAuthedApi, type AppRouteCtx } from '@/lib/with-authed-api'
import { assertApiRateLimit } from '@/lib/api-rate-limits'
import { API_ERROR_CODES } from '@/lib/api-error-codes'
import { API_NOT_FOUND } from '@/lib/api-route-codes'
import { apiError, apiSuccess } from '@/lib/api'
import {
  fetchChatMessagesPage,
  parseChatMessagesLimit,
} from '@/lib/chat-messages'
import { messageRpcToHttp, resetChatMessages } from '@/lib/message-ops'
import { runApiHandler } from '@/lib/observability/api-route'

export const GET = withAuthedApi<AppRouteCtx<{ chatId: string }>>(async (authed, req, routeCtx) => {
  if (!routeCtx?.params) return apiError('Bad request', 400)
  const { chatId } = await routeCtx.params
  return runApiHandler('GET /api/chats/:chatId/messages', req, async ({ setUserId }) => {
    const { supabase, user } = authed
    setUserId(user.id)

    const { data: chat } = await supabase
      .from('chats')
      .select('id')
      .eq('id', chatId)
      .eq('user_id', user.id)
      .single()

    if (!chat) {
      return apiError('Chat not found', 404, API_NOT_FOUND.chat)
    }

    const url = new URL(req.url)
    const limit = parseChatMessagesLimit(url.searchParams.get('limit'))
    const before = url.searchParams.get('before')

    const page = await fetchChatMessagesPage(supabase, chatId, {
      limit,
      before: before || null,
    })

    return apiSuccess({
      messages: page.messages,
      hasMore: page.hasMore,
      nextCursor: page.nextCursor,
    })
  })
})

export const DELETE = withAuthedApi<AppRouteCtx<{ chatId: string }>>(async (authed, req, routeCtx) => {
  if (!routeCtx?.params) return apiError('Bad request', 400)
  const { chatId } = await routeCtx.params
  return runApiHandler('DELETE /api/chats/:chatId/messages', req, async ({ req, log, setUserId }) => {
    const { supabase, user } = authed
    setUserId(user.id)

    const rateLimited = await assertApiRateLimit(user.id, 'chat_clear_messages')
    if (rateLimited) return rateLimited

    const { data: chat } = await supabase
      .from('chats')
      .select('id, character_id, characters(greeting)')
      .eq('id', chatId)
      .eq('user_id', user.id)
      .single()

    if (!chat) {
      return apiError('Chat not found', 404, API_NOT_FOUND.chat)
    }

    const deleteBody = await req.json().catch(() => ({}))
    const emptyOnly = deleteBody?.emptyOnly === true

    const character = Array.isArray(chat.characters) ? chat.characters[0] : chat.characters
    const greeting =
      emptyOnly || !character?.greeting ? null : String(character.greeting)

    const result = await log.span('reset_chat_messages', () =>
      resetChatMessages(supabase, user.id, chatId, {
        greeting,
        emptyOnly,
      })
    )
    const httpErr = messageRpcToHttp(result)
    if (httpErr) {
      return apiError(httpErr.message, httpErr.status, { code: httpErr.code })
    }
    if (!result.ok) {
      log.error('messages.reset_failed', { chatId, error: result.error })
      return apiError('Database error', 500, {
        code: API_ERROR_CODES.INTERNAL_ERROR,
      })
    }

    if (result.data.empty) {
      return apiSuccess({ greeting: null, empty: true })
    }

    return apiSuccess({ greeting: result.data.greeting })
  })
})
