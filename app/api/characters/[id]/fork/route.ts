import { withAuthedApi, type AppRouteCtx } from '@/lib/with-authed-api'
import { assertApiRateLimit } from '@/lib/api-rate-limits'
import { parseExampleDialogs, type ForkPayload } from '@/lib/character-fork'
import { API_NOT_FOUND } from '@/lib/api-route-codes'
import { apiError, apiSuccess } from '@/lib/api'
import { characterReadableByUser } from '@/lib/character-access'
import { runApiHandler } from '@/lib/observability/api-route'

export const POST = withAuthedApi<AppRouteCtx<{ id: string }>>(async (authed, req, routeCtx) => {
  if (!routeCtx?.params) return apiError('Bad request', 400)
  const { id: sourceId } = await routeCtx.params
  return runApiHandler('POST /api/characters/:id/fork', req, async ({ log, setUserId }) => {
    const { supabase, user } = authed
    setUserId(user.id)

    const rateLimited = await assertApiRateLimit(user.id, 'character_fork')
    if (rateLimited) return rateLimited

    const { data: source, error } = await supabase
      .from('characters')
      .select(
        'id, user_id, name, avatar_url, description, personality, scenario, greeting, example_dialogs, tags, is_nsfw, is_public'
      )
      .eq('id', sourceId)
      .single()

    if (error || !source) {
      return apiError('Character not found', 404, API_NOT_FOUND.character)
    }

    if (!characterReadableByUser(source, user.id)) {
      return apiError('Character not found', 404, API_NOT_FOUND.character)
    }

    const payload: ForkPayload = {
      fork: {
        name: source.name,
        description: source.description ?? '',
        personality: source.personality ?? '',
        scenario: source.scenario ?? '',
        greeting: source.greeting ?? '',
        exampleDialogs: parseExampleDialogs(source.example_dialogs),
        tags: source.tags ?? [],
        isNsfw: source.is_nsfw ?? false,
        isPublic: false,
        avatarUrl: source.avatar_url,
      },
      forkedFrom: {
        id: source.id,
        name: source.name,
      },
    }

    log.info('characters.fork_prepared', { sourceId })
    return apiSuccess({ fork: payload.fork, forkedFrom: payload.forkedFrom })
  })
})
