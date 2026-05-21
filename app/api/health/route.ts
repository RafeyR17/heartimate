import { apiSuccess } from '@/lib/api'
import { runApiHandler } from '@/lib/observability/api-route'

export async function GET(req: Request) {
  return runApiHandler('GET /api/health', req, async ({ log }) => {
    log.info('health.ok', { status: 'ok' })
    return apiSuccess({
      status: 'ok',
      timestamp: new Date().toISOString(),
    })
  })
}
