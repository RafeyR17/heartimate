import 'server-only'
import { apiError } from '@/lib/api'
import { API_ERROR_CODES } from '@/lib/api-error-codes'
import { attachRequestId, getRequestId } from '@/lib/observability/request-id'
import {
  createApiLogger,
  logApiResponse,
  type ApiLogger,
} from '@/lib/observability/api-logger'
import {
  runWithApiContext,
  type ApiRequestContext,
} from '@/lib/observability/request-context'

export { getApiContext, getApiRequestId } from '@/lib/observability/request-context'
export type { ApiRequestContext } from '@/lib/observability/request-context'

export type ApiRouteHandler = (ctx: {
  req: Request
  log: ApiLogger
  requestId: string
  route: string
  setUserId: (userId: string) => void
}) => Promise<Response>

/**
 * Wraps an API route: assigns request id, structured start/complete logs, X-Request-Id on response.
 */
export async function runApiHandler(
  route: string,
  req: Request,
  handler: ApiRouteHandler
): Promise<Response> {
  const requestId = getRequestId(req)
  const log = createApiLogger({ requestId, route })
  const started = Date.now()
  let userId: string | undefined

  const store: ApiRequestContext = { requestId, route, log, userId }

  log.info('request.start', {
    method: req.method,
    path: new URL(req.url).pathname,
  })

  try {
    const res = await runWithApiContext(store, () =>
      handler({
        req,
        log,
        requestId,
        route,
        setUserId: (id) => {
          userId = id
          store.userId = id
        },
      })
    )
    logApiResponse({
      requestId,
      route,
      status: res.status,
      durationMs: Date.now() - started,
      userId: store.userId ?? userId,
    })
    return attachRequestId(res, requestId)
  } catch (err) {
    log.error('request.unhandled', {
      error: err instanceof Error ? err.message : String(err),
      durationMs: Date.now() - started,
      userId: store.userId ?? userId,
    })
    const res = apiError('Internal server error', 500, {
      requestId,
      code: API_ERROR_CODES.INTERNAL_ERROR,
    })
    logApiResponse({
      requestId,
      route,
      status: res.status,
      durationMs: Date.now() - started,
      userId: store.userId ?? userId,
    })
    return res
  }
}
