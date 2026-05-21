import { withAuthedApi } from '@/lib/with-authed-api'
import { apiSuccess } from '@/lib/api'
import { runApiHandler } from '@/lib/observability/api-route'
import { updateStreak } from '@/lib/streak'
import { assertApiRateLimit } from '@/lib/api-rate-limits'

export const POST = withAuthedApi(async (authed, req: Request) => {
  return runApiHandler('POST /api/streak', req, async ({ setUserId }) => {
    const { supabase, user } = authed
    setUserId(user.id)

    const rateLimited = await assertApiRateLimit(user.id, 'update_streak')
    if (rateLimited) return rateLimited

    const result = await updateStreak(user.id, supabase)

    return apiSuccess({
      streak: result?.newStreak ?? 0,
      changed: result?.changed ?? false,
      isNewRecord: result?.isNewRecord ?? false,
    })
  })
})
