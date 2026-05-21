import { withAuthedApi } from '@/lib/with-authed-api'
import { assertApiRateLimit } from '@/lib/api-rate-limits'
import { API_ERROR_CODES } from '@/lib/api-error-codes'
import { API_NOT_FOUND } from '@/lib/api-route-codes'
import { apiError, apiSuccess } from '@/lib/api'
import { routeFailure } from '@/lib/observability/route-error'
import { parseJsonBody, onboardingPostSchema } from '@/lib/api-schemas'
import { fetchOnboardingStarters } from '@/lib/onboarding-starters'
import { runApiHandler } from '@/lib/observability/api-route'
import { createSupabaseAnonClient } from '@/lib/supabase-server'

export async function GET(req: Request) {
  return runApiHandler('GET /api/onboarding', req, async ({ log }) => {
    try {
      const supabase = createSupabaseAnonClient()
      const starters = await fetchOnboardingStarters(supabase, 3)
      log.info('onboarding.starters', { count: starters.length })
      return apiSuccess({ starters })
    } catch (err) {
      return routeFailure(log, 'onboarding.starters_failed', err, {}, {
        message: 'Failed to load starter characters',
        status: 500,
        code: API_ERROR_CODES.INTERNAL_ERROR,
      })
    }
  })
}

export const POST = withAuthedApi(async (authed, req: Request) => {
  return runApiHandler('POST /api/onboarding', req, async ({ req, log, setUserId }) => {
    const { supabase, user, clerkId } = authed
    setUserId(user.id)

    const rateLimited = await assertApiRateLimit(user.id, 'onboarding')
    if (rateLimited) return rateLimited

    const bodyResult = await parseJsonBody(req, onboardingPostSchema)
    if (!bodyResult.ok) return bodyResult.response

    const { displayName, kinkPrefs, starterCharId, characterName, isAdult } =
      bodyResult.data
    // Zod requires isAdult === true; durable gate for NSFW is adult_confirmed_at below.
    if (!isAdult) {
      return apiError('Must confirm you are 18 or older', 400)
    }

    const { data: character } = await supabase
      .from('characters')
      .select('id, name, greeting, is_public')
      .eq('id', starterCharId)
      .eq('is_public', true)
      .maybeSingle()

    if (!character) {
      return apiError('Starter character not found', 404, API_NOT_FOUND.character)
    }

    const { data: updatedUser, error: userError } = await supabase
      .from('users')
      .upsert(
        {
          clerk_id: clerkId,
          display_name: displayName,
          kink_prefs: kinkPrefs,
          adult_confirmed_at: new Date().toISOString(),
        },
        { onConflict: 'clerk_id' }
      )
      .select()
      .single()

    if (userError) {
      log.error('onboarding.user_upsert_failed', { error: userError.message })
      return apiError('Database error creating user', 500, {
        code: API_ERROR_CODES.INTERNAL_ERROR,
      })
    }

    const titleString = characterName
      ? `${characterName}'s Story`
      : `${character.name}'s Story`

    const { data: created, error: createError } = await supabase.rpc(
      'create_chat_with_greeting',
      {
        p_user_id: updatedUser?.id ?? user.id,
        p_character_id: starterCharId,
        p_persona_id: null,
        p_title: titleString,
        p_greeting: character.greeting ?? '',
      }
    )

    if (createError || !created || typeof created !== 'object') {
      log.error('onboarding.create_chat_failed', { error: createError?.message })
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

    log.info('onboarding.completed', { chatId, starterCharId })
    return apiSuccess({ chatId })
  })
})
