import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { apiSuccess } from '@/lib/api'
import { runApiHandler } from '@/lib/observability/api-route'

const SPEC_PATH = join(process.cwd(), 'openapi', 'heartimate.openapi.json')

export async function GET(req: Request) {
  return runApiHandler('GET /api/openapi', req, async ({ log }) => {
    try {
      const raw = readFileSync(SPEC_PATH, 'utf8')
      const spec = JSON.parse(raw) as Record<string, unknown>
      return apiSuccess({ spec })
    } catch (err) {
      log.error('openapi.load_failed', {
        error: err instanceof Error ? err.message : String(err),
      })
      return apiSuccess({
        spec: null,
        error: 'OpenAPI spec file missing',
      })
    }
  })
}
