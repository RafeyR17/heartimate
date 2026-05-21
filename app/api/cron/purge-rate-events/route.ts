import { apiError, apiSuccess } from '@/lib/api'
import { getServiceRoleClient } from '@/lib/service-role'
import { runApiHandler } from '@/lib/observability/api-route'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Daily maintenance: purge rate ledger rows older than 7 days.
 * Vercel Cron: Authorization: Bearer $CRON_SECRET
 */
export async function GET(req: Request) {
  return runApiHandler('GET /api/cron/purge-rate-events', req, async ({ log }) => {
    const secret = process.env.CRON_SECRET
    if (!secret) {
      log.error('cron.missing_secret', {})
      return apiError('Cron not configured', 503)
    }

    const auth = req.headers.get('authorization')
    const expected = `Bearer ${secret}`
    
    let isMatch = false
    if (auth && auth.length === expected.length) {
      const crypto = await import('crypto')
      isMatch = crypto.timingSafeEqual(Buffer.from(auth), Buffer.from(expected))
    }

    if (!isMatch) {
      return apiError('Unauthorized', 401)
    }

    const supabase = getServiceRoleClient()
    const { data, error } = await supabase.rpc('purge_rate_ledgers')

    if (error) {
      log.error('cron.purge_failed', { error: error.message })
      return apiError('Purge failed', 500)
    }

    log.info('cron.purge_complete', { result: data })
    return apiSuccess({ result: data })
  })
}
