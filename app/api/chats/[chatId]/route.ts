import { withAuthedApi, type AppRouteCtx } from '@/lib/with-authed-api'
import { assertApiRateLimit } from '@/lib/api-rate-limits'
import { API_ERROR_CODES } from '@/lib/api-error-codes'
import { apiError, apiSuccess } from '@/lib/api'
import { routeFailure } from '@/lib/observability/route-error'
import { parseJsonBody, chatPatchSchema } from '@/lib/api-schemas'
import { runApiHandler } from '@/lib/observability/api-route'

export const PATCH = withAuthedApi<AppRouteCtx<{ chatId: string }>>(async (authed, req, routeCtx) => {
  if (!routeCtx?.params) return apiError('Bad request', 400)
  const { chatId } = await routeCtx.params
  return runApiHandler('PATCH /api/chats/:chatId', req, async ({ req: request, log, setUserId }) => {
    const { supabase, user } = authed
    setUserId(user.id)

    const rateLimited = await assertApiRateLimit(user.id, 'chat_update')
    if (rateLimited) return rateLimited

    try {
      const bodyResult = await parseJsonBody(request, chatPatchSchema)
      if (!bodyResult.ok) return bodyResult.response

      const { personaId, title: titleRaw } = bodyResult.data

      const { data: chat } = await supabase
        .from('chats')
        .select('id')
        .eq('id', chatId)
        .eq('user_id', user.id)
        .maybeSingle()

      if (!chat) {
        return apiError('Chat not found', 404, { code: API_ERROR_CODES.CHAT_NOT_FOUND })
      }

      if (personaId) {
        const { data: persona } = await supabase
          .from('personas')
          .select('id')
          .eq('id', personaId)
          .eq('user_id', user.id)
          .maybeSingle()

        if (!persona) {
          return apiError('Persona not found', 404, {
            code: API_ERROR_CODES.PERSONA_NOT_FOUND,
          })
        }
      }

      const updates: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      }

      if (titleRaw !== undefined) {
        if (!titleRaw) {
          return apiError('Title cannot be empty', 400)
        }
        updates.title = titleRaw
      }

      if (personaId !== undefined) {
        updates.persona_id = personaId
      }

      const { data: updated, error } = await supabase
        .from('chats')
        .update(updates)
        .eq('id', chatId)
        .eq('user_id', user.id)
        .select(`
        id,
        title,
        persona_id,
        persona:personas (
          id,
          name,
          avatar_url,
          short_bio,
          appearance,
          personality
        )
      `)
        .single()

      if (error) throw error

      const persona = Array.isArray(updated?.persona)
        ? updated.persona[0]
        : updated?.persona

      log.info('chats.updated', { chatId })
      return apiSuccess({
        chatId: updated?.id,
        title: updated?.title,
        personaId: updated?.persona_id ?? null,
        persona: persona ?? null,
      })
    } catch (err) {
      return routeFailure(log, 'chats.patch_failed', err, { chatId }, {
        message: 'Failed to update chat',
        status: 500,
        code: API_ERROR_CODES.INTERNAL_ERROR,
      })
    }
  })
})

export const DELETE = withAuthedApi<AppRouteCtx<{ chatId: string }>>(async (authed, req, routeCtx) => {
  if (!routeCtx?.params) return apiError('Bad request', 400)
  const { chatId } = await routeCtx.params
  return runApiHandler('DELETE /api/chats/:chatId', req, async ({ log, setUserId }) => {
    const { supabase, user } = authed
    setUserId(user.id)

    const rateLimited = await assertApiRateLimit(user.id, 'chat_delete')
    if (rateLimited) return rateLimited

    try {
      const { data: chat } = await supabase
        .from('chats')
        .select('id')
        .eq('id', chatId)
        .eq('user_id', user.id)
        .maybeSingle()

      if (!chat) {
        return apiError('Chat not found', 404, { code: API_ERROR_CODES.CHAT_NOT_FOUND })
      }

      const { error } = await supabase.from('chats').delete().eq('id', chatId).eq('user_id', user.id)

      if (error) throw error

      log.info('chats.deleted', { chatId })
      return apiSuccess({})
    } catch (err) {
      return routeFailure(log, 'chats.delete_failed', err, { chatId }, {
        message: 'Failed to delete chat',
        status: 500,
        code: API_ERROR_CODES.INTERNAL_ERROR,
      })
    }
  })
})
