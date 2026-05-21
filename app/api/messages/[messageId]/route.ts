import { withAuthedApi, type AppRouteCtx } from '@/lib/with-authed-api'
import { assertApiRateLimit } from '@/lib/api-rate-limits'
import { API_ERROR_CODES } from '@/lib/api-error-codes'
import { apiError, apiSuccess } from '@/lib/api'
import { parseJsonBody, messagePatchSchema } from '@/lib/api-schemas'
import {
  deleteOwnedMessage,
  messageRpcToHttp,
  patchUserMessage,
} from '@/lib/message-ops'
import { runApiHandler } from '@/lib/observability/api-route'

export const PATCH = withAuthedApi<AppRouteCtx<{ messageId: string }>>(async (authed, req, routeCtx) => {
  if (!routeCtx?.params) return apiError('Bad request', 400)
  const { messageId } = await routeCtx.params
  return runApiHandler('PATCH /api/messages/:messageId', req, async ({ req, log, setUserId }) => {
    const { supabase, user } = authed
    setUserId(user.id)

    const rateLimited = await assertApiRateLimit(user.id, 'message_update')
    if (rateLimited) return rateLimited

    const bodyResult = await parseJsonBody(req, messagePatchSchema)
    if (!bodyResult.ok) return bodyResult.response

    const { content: messageContent, truncateAfter = false } = bodyResult.data

    const result = await log.span('patch_user_message', () =>
      patchUserMessage(supabase, user.id, messageId, messageContent, truncateAfter)
    )
    const httpErr = messageRpcToHttp(result)
    if (httpErr) {
      return apiError(httpErr.message, httpErr.status, { code: httpErr.code })
    }
    if (!result.ok) {
      log.error('messages.patch_failed', {
        messageId,
        error: result.error,
      })
      return apiError('Failed to update message', 500, {
        code: API_ERROR_CODES.INTERNAL_ERROR,
      })
    }

    return apiSuccess({ message: result.data })
  })
})

export const DELETE = withAuthedApi<AppRouteCtx<{ messageId: string }>>(async (authed, _req, routeCtx) => {
  if (!routeCtx?.params) return apiError('Bad request', 400)
  const { messageId } = await routeCtx.params
  return runApiHandler(
    'DELETE /api/messages/:messageId',
    _req,
    async ({ log, setUserId }) => {
      const { supabase, user } = authed
      setUserId(user.id)

      const rateLimited = await assertApiRateLimit(user.id, 'message_delete')
      if (rateLimited) return rateLimited

      const result = await log.span('delete_owned_message', () =>
        deleteOwnedMessage(supabase, user.id, messageId)
      )
      const httpErr = messageRpcToHttp(result)
      if (httpErr) {
        return apiError(httpErr.message, httpErr.status, { code: httpErr.code })
      }
      if (!result.ok) {
        log.error('messages.delete_failed', {
          messageId,
          error: result.error,
        })
        return apiError('Failed to delete message', 500, {
          code: API_ERROR_CODES.INTERNAL_ERROR,
        })
      }

      return apiSuccess({ deleted: true })
    }
  )
})
