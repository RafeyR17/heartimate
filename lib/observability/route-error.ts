import 'server-only'

import { apiError, type ApiResponseOptions } from '@/lib/api'
import type { ApiErrorCode } from '@/lib/api-error-codes'
import type { ApiLogger } from '@/lib/observability/api-logger'

/** Safe one-line message for structured logs (never sent to clients). */
export function serializeRouteError(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

export function logRouteError(
  log: ApiLogger,
  event: string,
  err: unknown,
  context?: Record<string, unknown>
): void {
  log.error(event, {
    ...context,
    error: serializeRouteError(err),
  })
}

export type RouteFailureClient = {
  message: string
  status: number
  code?: ApiErrorCode
}

/**
 * Log with request context, return generic apiError (no stack / internal details).
 */
export function routeFailure(
  log: ApiLogger,
  event: string,
  err: unknown,
  context: Record<string, unknown>,
  client: RouteFailureClient,
  opts?: ApiResponseOptions
): Response {
  logRouteError(log, event, err, context)
  return apiError(client.message, client.status, {
    ...opts,
    code: client.code ?? opts?.code,
  })
}
