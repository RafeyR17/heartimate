import { withAuthedApi } from '@/lib/with-authed-api'
import { assertApiRateLimit } from '@/lib/api-rate-limits'
import { API_ERROR_CODES } from '@/lib/api-error-codes'
import { API_NOT_FOUND } from '@/lib/api-route-codes'
import { apiError, apiSuccess } from '@/lib/api'
import { routeFailure } from '@/lib/observability/route-error'
import { parseJsonBody, chatsPostSchema } from '@/lib/api-schemas'
import { characterReadableByUser } from '@/lib/character-access'
import { ensureDefaultPersona } from '@/lib/personas'
import { getPostHogClient } from '@/lib/posthog-server'
import { runApiHandler } from '@/lib/observability/api-route'

export const POST = withAuthedApi(async (authed, req: Request) => {
  return runApiHandler('POST /api/chats', req, async ({ req, log, setUserId }) => {
    const { supabase, user, clerkId } = authed
    setUserId(user.id)

    const rateLimited = await assertApiRateLimit(user.id, 'chat_create')
    if (rateLimited) return rateLimited

    try {
    const bodyResult = await parseJsonBody(req, chatsPostSchema)
    if (!bodyResult.ok) return bodyResult.response

    const { characterId, personaId: personaIdRaw, skipDefaultPersona } = bodyResult.data

    let resolvedPersonaId: string | null =
      personaIdRaw === undefined ? null : personaIdRaw

    if (personaIdRaw === undefined && !skipDefaultPersona) {
      const { count } = await supabase
        .from('personas')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)

      if (!count || count === 0) {
        const defaultPersona = await ensureDefaultPersona(
          supabase,
          user.id,
          user.display_name
        )
        if (defaultPersona) {
          resolvedPersonaId = defaultPersona.id
        }
      }
    }

    if (resolvedPersonaId) {
      const { data: persona } = await supabase
        .from('personas')
        .select('id')
        .eq('id', resolvedPersonaId)
        .eq('user_id', user.id)
        .maybeSingle()

      if (!persona) {
        return apiError('Persona not found', 404, API_NOT_FOUND.persona)
      }
    }

    const { data: existingChat } = await supabase
      .from('chats')
      .select('id, persona_id')
      .eq('user_id', user.id)
      .eq('character_id', characterId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existingChat) {
      if (personaIdRaw !== undefined && existingChat.persona_id !== resolvedPersonaId) {
        await supabase
          .from('chats')
          .update({
            persona_id: resolvedPersonaId,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingChat.id)
      }

      return apiSuccess({
        chatId: existingChat.id,
        personaId: resolvedPersonaId,
      })
    }

    const { data: character } = await supabase
      .from('characters')
      .select('id, user_id, is_public, name, greeting')
      .eq('id', characterId)
      .single()

    if (!character) {
      return apiError('Character not found', 404, API_NOT_FOUND.character)
    }

    if (!characterReadableByUser(character, user.id)) {
      return apiError('Character not found', 404, API_NOT_FOUND.character)
    }

    const title = `${character.name}'s Story`
    const { data: created, error: createError } = await supabase.rpc(
      'create_chat_with_greeting',
      {
        p_user_id: user.id,
        p_character_id: characterId,
        p_persona_id: resolvedPersonaId,
        p_title: title,
        p_greeting: character.greeting ?? '',
      }
    )

    if (createError || !created || typeof created !== 'object') {
      log.error('chats.create_rpc_failed', {
        error: createError?.message ?? 'unknown',
      })
      return apiError('Failed to create chat', 500, {
        code: API_ERROR_CODES.INTERNAL_ERROR,
      })
    }

    const chatId = (created as { chat_id?: string }).chat_id
    if (!chatId) {
      return apiError('Failed to create chat', 500, {
        code: API_ERROR_CODES.INTERNAL_ERROR,
      })
    }

    const posthog = getPostHogClient()
    posthog.capture({
      distinctId: clerkId,
      event: 'chat_started',
      properties: {
        chat_id: chatId,
        character_id: characterId,
        character_name: character.name,
        has_persona: !!resolvedPersonaId,
      },
    })

    return apiSuccess({
      chatId,
      personaId: resolvedPersonaId,
    })
    } catch (err) {
      return routeFailure(log, 'chat.create_failed', err, {}, {
        message: 'Internal server error',
        status: 500,
        code: API_ERROR_CODES.INTERNAL_ERROR,
      })
    }
  })
})
