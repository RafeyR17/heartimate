import { createAuthedDb, type AuthedDb } from '@/lib/authed-db'
import { apiError } from '@/lib/api'
import { API_ERROR_CODES } from '@/lib/api-error-codes'

/** Next.js App Router dynamic segment context. */
export type AppRouteCtx<T extends Record<string, string>> = {
  params: Promise<T>
}

export function withAuthedApi<RouteCtx = unknown>(
  handler: (ctx: AuthedDb, req: Request, routeCtx?: RouteCtx) => Promise<Response>
) {
  return async (req: Request, routeCtx?: RouteCtx) => {
    const authed = await createAuthedDb()
    if (!authed) {
      return apiError('Unauthorized', 401, { code: API_ERROR_CODES.UNAUTHORIZED })
    }
    return handler(authed, req, routeCtx)
  }
}
