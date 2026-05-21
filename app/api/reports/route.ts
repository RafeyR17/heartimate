import { withAuthedApi } from '@/lib/with-authed-api'
import { assertApiRateLimit } from '@/lib/api-rate-limits'
import { API_NOT_FOUND } from '@/lib/api-route-codes'
import { apiError, apiSuccess } from '@/lib/api'
import { parseJsonBody, reportsPostSchema } from '@/lib/api-schemas'
import { characterReadableByUser } from '@/lib/character-access'
import { runApiHandler } from '@/lib/observability/api-route'
import { getPostHogClient } from '@/lib/posthog-server'

export const POST = withAuthedApi(async (authed, req: Request) => {
  return runApiHandler('POST /api/reports', req, async ({ req, log, setUserId }) => {
    const { supabase, user, clerkId } = authed
    setUserId(user.id)

    const rateLimited = await assertApiRateLimit(user.id, 'report')
    if (rateLimited) return rateLimited

    const bodyResult = await parseJsonBody(req, reportsPostSchema)
    if (!bodyResult.ok) return bodyResult.response

    const { characterId, reason, details } = bodyResult.data

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

    const { error: insertError } = await supabase.from('reports').insert({
      character_id: characterId,
      user_id: user.id,
      reason,
      details: details?.trim() || null,
    })

    if (insertError) {
      log.error('report.insert_failed', { characterId, error: insertError.message })
      return apiError(
        'Failed to submit report. Ensure the reports table exists.',
        500
      )
    }

    const posthog = getPostHogClient()
    posthog.capture({
      distinctId: clerkId,
      event: 'character_reported',
      properties: {
        character_id: characterId,
        reason,
      },
    })

    log.info('report.submitted', { characterId, reason })
    return apiSuccess({})
  })
})
