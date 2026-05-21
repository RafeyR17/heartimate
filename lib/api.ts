import { API_ERROR_CODES, type ApiErrorCode } from '@/lib/api-error-codes'
import { attachRequestId } from '@/lib/observability/request-id'
import { getApiRequestId } from '@/lib/observability/request-context'

export type ApiResponseOptions = {
  requestId?: string
  /** Override status-derived default; always sent in JSON `code`. */
  code?: ApiErrorCode
}

function resolveRequestId(explicit?: string): string | undefined {
  return explicit ?? getApiRequestId()
}

/** Default machine-readable code when route omits explicit `code`. */
export function resolveApiErrorCode(
  status: number,
  explicit?: ApiErrorCode
): ApiErrorCode {
  if (explicit) return explicit
  switch (status) {
    case 400:
      return API_ERROR_CODES.BAD_REQUEST
    case 401:
      return API_ERROR_CODES.UNAUTHORIZED
    case 403:
      return API_ERROR_CODES.FORBIDDEN
    case 404:
      return API_ERROR_CODES.NOT_FOUND
    case 409:
      return API_ERROR_CODES.DUPLICATE_REQUEST
    case 413:
      return API_ERROR_CODES.REQUEST_TOO_LARGE
    case 429:
      return API_ERROR_CODES.RATE_LIMITED
    case 503:
      return API_ERROR_CODES.SERVICE_UNAVAILABLE
    default:
      return API_ERROR_CODES.INTERNAL_ERROR
  }
}

export function apiError(
  message: string,
  status: number = 500,
  opts?: ApiResponseOptions
) {
  const requestId = resolveRequestId(opts?.requestId)
  const body: { error: string; success: false; code: ApiErrorCode } = {
    error: message,
    success: false,
    code: resolveApiErrorCode(status, opts?.code),
  }
  const res = Response.json(body, { status })
  return requestId ? attachRequestId(res, requestId) : res
}

export function apiSuccess(
  data: Record<string, unknown>,
  status: number = 200,
  opts?: ApiResponseOptions
) {
  const requestId = resolveRequestId(opts?.requestId)
  const res = Response.json({ ...data, success: true }, { status })
  return requestId ? attachRequestId(res, requestId) : res
}

/**
 * Plain-text streaming response for POST /api/chat (not JSON).
 * Relationship metadata is passed via X-* headers; body is token stream only.
 */
export function streamTextResponse(
  stream: ReadableStream<Uint8Array>,
  extraHeaders?: Record<string, string>,
  opts?: ApiResponseOptions
): Response {
  const requestId = resolveRequestId(opts?.requestId)
  const headers: Record<string, string> = {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
    ...extraHeaders,
  }
  if (requestId) {
    headers['x-request-id'] = requestId
  }
  return new Response(stream, { headers })
}
