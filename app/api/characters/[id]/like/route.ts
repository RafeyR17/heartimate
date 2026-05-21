import { withAuthedApi, type AppRouteCtx } from '@/lib/with-authed-api'
import { assertApiRateLimit } from '@/lib/api-rate-limits'
import { API_NOT_FOUND } from '@/lib/api-route-codes'
import { apiError, apiSuccess } from '@/lib/api'
import { characterReadableByUser } from '@/lib/character-access'
import { runApiHandler } from '@/lib/observability/api-route'

export const POST = withAuthedApi<AppRouteCtx<{ id: string }>>(async (authed, _req, routeCtx) => {
  if (!routeCtx?.params) return apiError('Bad request', 400)
  const { id: characterId } = await routeCtx.params
  return runApiHandler('POST /api/characters/:id/like', _req, async ({ log, setUserId }) => {
    const { supabase, user } = authed
    setUserId(user.id)

    const rateLimited = await assertApiRateLimit(user.id, 'character_like')
    if (rateLimited) return rateLimited

    const { data: character } = await supabase
      .from('characters')
      .select('id, user_id, is_public')
      .eq('id', characterId)
      .maybeSingle()

    if (!character) {
      return apiError('Character not found', 404, API_NOT_FOUND.character)
    }

    if (!characterReadableByUser(character, user.id)) {
      return apiError('Character not found', 404, API_NOT_FOUND.character)
    }

    const { data: existingLike } = await supabase
      .from('character_likes')
      .select('id')
      .eq('user_id', user.id)
      .eq('character_id', characterId)
      .maybeSingle()

    if (existingLike) {
      const { error: deleteError } = await supabase
        .from('character_likes')
        .delete()
        .eq('id', existingLike.id)

      if (deleteError) {
        log.error('like.delete_failed', { error: deleteError.message })
        return apiError('Failed to unlike', 500)
      }

      const { data: updated } = await supabase
        .from('characters')
        .select('likes_count')
        .eq('id', characterId)
        .single()

      log.info('like.removed', { characterId })
      return apiSuccess({
        liked: false,
        likesCount: updated?.likes_count ?? 0,
      })
    }

    const { error: insertError } = await supabase.from('character_likes').insert({
      user_id: user.id,
      character_id: characterId,
    })

    if (insertError) {
      log.error('like.insert_failed', { error: insertError.message })
      return apiError('Failed to like', 500)
    }

    const { data: updated } = await supabase
      .from('characters')
      .select('likes_count')
      .eq('id', characterId)
      .single()

    log.info('like.added', { characterId })
    return apiSuccess({
      liked: true,
      likesCount: updated?.likes_count ?? 0,
    })
  })
})
