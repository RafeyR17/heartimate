import { REQUEST_ID_HEADER } from '@/lib/observability/constants'

const REQUEST_ID_RE = /^[a-zA-Z0-9_-]{8,128}$/

export function normalizeRequestId(raw: string | null): string {
  if (raw) {
    const trimmed = raw.trim().slice(0, 128)
    if (REQUEST_ID_RE.test(trimmed)) return trimmed
  }
  return crypto.randomUUID()
}

export function getRequestId(req: Request): string {
  return normalizeRequestId(req.headers.get(REQUEST_ID_HEADER))
}

export function attachRequestId(res: Response, requestId: string): Response {
  const headers = new Headers(res.headers)
  headers.set(REQUEST_ID_HEADER, requestId)
  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers,
  })
}
