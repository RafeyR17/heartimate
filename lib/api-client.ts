/** Helpers for reading standardized API JSON (`apiSuccess` / `apiError`). */

import { API_ERROR_CODES } from '@/lib/api-error-codes'

export type ApiJson = Record<string, unknown> & {
  success?: boolean
  error?: string
  retryAfter?: number
  code?: string
}

export type ParsedApiError = {
  status: number
  error: string
  retryAfter?: number
  code?: string
  upgradeUrl?: string
  resetIn?: string
}

export type ApiFetchSuccess<T> = { ok: true; data: T }

export type ApiFetchFailure = {
  ok: false
  error: string
  status: number
  retryAfter?: number
  code?: string
  upgradeUrl?: string
  resetIn?: string
}

export type ApiFetchResult<T> = ApiFetchSuccess<T> | ApiFetchFailure

export function apiFetchFailureToParsed(failure: ApiFetchFailure): ParsedApiError {
  return {
    status: failure.status,
    error: failure.error,
    retryAfter: failure.retryAfter,
    code: failure.code,
  }
}

export type ChatApiErrorDisplay = {
  inlineMarkdown: string
  toastTitle: string
  toastMessage?: string
  redirectToLogin?: boolean
  showQuotaModal?: boolean
  upgradeUrl?: string
  resetIn?: string
}

export class ApiRequestError extends Error {
  readonly parsed: ParsedApiError
  readonly display: ChatApiErrorDisplay

  constructor(parsed: ParsedApiError, display: ChatApiErrorDisplay) {
    super(display.toastTitle)
    this.name = 'ApiRequestError'
    this.parsed = parsed
    this.display = display
  }
}

/** POST /api/chat pre-stream failures (JSON body). */
export class ChatApiRequestError extends ApiRequestError {
  constructor(display: ChatApiErrorDisplay, parsed: ParsedApiError) {
    super(parsed, display)
    this.name = 'ChatApiRequestError'
  }
}

export async function readApiJson(res: Response): Promise<ApiJson> {
  try {
    return (await res.json()) as ApiJson
  } catch {
    return { success: false, error: 'Invalid JSON response' }
  }
}

function parseRetryAfterHeader(value: string | null): number | undefined {
  if (!value) return undefined
  const sec = parseInt(value, 10)
  return Number.isFinite(sec) && sec > 0 ? sec : undefined
}

/** Build parsed error from an already-read JSON body (avoids double-consuming the response). */
export function parsedFromApiJson(res: Response, data: ApiJson): ParsedApiError {
  const retryAfter =
    typeof data.retryAfter === 'number' && data.retryAfter > 0
      ? Math.ceil(data.retryAfter)
      : parseRetryAfterHeader(res.headers.get('Retry-After'))
  const error =
    typeof data.error === 'string' && data.error.trim()
      ? data.error.trim()
      : res.statusText || 'Request failed'
  const code =
    typeof data.code === 'string' && data.code.trim() ? data.code.trim() : undefined
  const upgradeUrl =
    typeof data.upgradeUrl === 'string' && data.upgradeUrl.trim()
      ? data.upgradeUrl.trim()
      : undefined
  const resetIn =
    typeof data.resetIn === 'string' && data.resetIn.trim()
      ? data.resetIn.trim()
      : undefined
  return { status: res.status, error, retryAfter, code, upgradeUrl, resetIn }
}

/** Read JSON error envelope from a failed API response (e.g. POST /api/chat when !ok). */
export async function parseApiErrorResponse(res: Response): Promise<ParsedApiError> {
  const data = await readApiJson(res)
  return parsedFromApiJson(res, data)
}

export type FormatApiErrorOptions = {
  toastTitle?: string
  /** When false, toast only (e.g. load-older). Default true for inline markdown on failures. */
  inline?: boolean
}

/** Map API JSON errors for non-stream routes (messages, chats, etc.). */
export function formatApiError(
  parsed: ParsedApiError,
  opts?: FormatApiErrorOptions
): ChatApiErrorDisplay {
  let base = formatChatApiError(parsed)
  if (!opts?.toastTitle && parsed.code) {
    const byCode: Partial<Record<string, string>> = {
      [API_ERROR_CODES.MESSAGE_NOT_FOUND]: 'Message not found',
      [API_ERROR_CODES.CHAT_NOT_FOUND]: 'Chat not found',
      [API_ERROR_CODES.CHARACTER_NOT_FOUND]: 'Character not found',
      [API_ERROR_CODES.PERSONA_NOT_FOUND]: 'Persona not found',
    }
    const titled = parsed.code ? byCode[parsed.code] : undefined
    if (titled) base = { ...base, toastTitle: titled }
  }
  const withTitle = opts?.toastTitle ? { ...base, toastTitle: opts.toastTitle } : base
  if (opts?.inline === false) {
    return { ...withTitle, inlineMarkdown: '' }
  }
  return withTitle
}

/** Map POST /api/chat failure status + body to inline assistant copy and toast. */
export function formatChatApiError(parsed: ParsedApiError): ChatApiErrorDisplay {
  switch (parsed.status) {
    case 401:
      return {
        inlineMarkdown: '*Your session expired. Redirecting to sign in…*',
        toastTitle: 'Session expired',
        toastMessage: 'Please sign in again.',
        redirectToLogin: true,
      }
    case 409:
      return {
        inlineMarkdown: '*Still processing your last message…*',
        toastTitle: 'Please wait',
        toastMessage: 'Still processing your last message…',
      }
    case 413:
      return {
        inlineMarkdown: '*Message too long.*',
        toastTitle: 'Message too long',
        toastMessage: 'Shorten your message and try again.',
      }
    case 429: {
      if (
        parsed.code === 'daily_chat_limit' ||
        parsed.code === 'quota_exceeded'
      ) {
        const fallback = parsed.error || 'Daily message limit reached'
        return {
          inlineMarkdown: `*${fallback}*`,
          toastTitle: 'Daily limit reached',
          toastMessage: fallback,
          showQuotaModal: true,
          upgradeUrl: parsed.upgradeUrl ?? '/settings',
          resetIn: parsed.resetIn,
        }
      }
      const sec = parsed.retryAfter ?? 60
      const msg = `Slow down — try again in ${sec}s`
      return {
        inlineMarkdown: `*${msg}*`,
        toastTitle: 'Too many requests',
        toastMessage: msg,
      }
    }
    case 503: {
      const fallback = parsed.error || 'Chat is temporarily unavailable. Try again shortly.'
      const migrationHint = /idempotency|20240530_chat_idempotency/i.test(fallback)
      return {
        inlineMarkdown: migrationHint
          ? '*Chat needs a database update.*'
          : '*Chat is temporarily unavailable.*',
        toastTitle: migrationHint ? 'Database migration needed' : 'Chat unavailable',
        toastMessage: migrationHint
          ? 'Apply migration 20240530_chat_idempotency.sql in Supabase, then retry.'
          : fallback,
      }
    }
    default: {
      const fallback = parsed.error || 'Something went wrong'
      return {
        inlineMarkdown: `*${fallback}*`,
        toastTitle: 'Could not send message',
        toastMessage: fallback,
      }
    }
  }
}

export async function assertChatPostOk(res: Response): Promise<void> {
  if (res.ok) return
  const parsed = await parseApiErrorResponse(res)
  const display = formatChatApiError(parsed)
  throw new ChatApiRequestError(display, parsed)
}

/**
 * fetch() + readApiJson; returns a result union (no throw).
 * Use for JSON API routes (not POST /api/chat plain-text stream).
 */
export async function apiFetch<T = ApiJson>(
  url: string,
  init?: RequestInit
): Promise<ApiFetchResult<T>> {
  try {
    const res = await fetch(url, init)
    const data = await readApiJson(res)
    if (!res.ok) {
      const parsed = parsedFromApiJson(res, data)
      return {
        ok: false,
        error: parsed.error,
        status: parsed.status,
        retryAfter: parsed.retryAfter,
        code: parsed.code,
        upgradeUrl: parsed.upgradeUrl,
        resetIn: parsed.resetIn,
      }
    }
    return { ok: true, data: data as T }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Network request failed',
      status: 0,
    }
  }
}

export type FetchApiJsonOptions = RequestInit & {
  errorToastTitle?: string
  inlineError?: boolean
}

/**
 * apiFetch + throw ApiRequestError when !ok.
 * Prefer apiFetch when handling errors locally without try/catch.
 */
export async function fetchApiJson(
  url: string,
  init?: FetchApiJsonOptions
): Promise<ApiJson> {
  const { errorToastTitle, inlineError, ...requestInit } = init ?? {}
  const result = await apiFetch(url, requestInit)
  if (!result.ok) {
    const parsed = apiFetchFailureToParsed(result)
    const display = formatApiError(parsed, {
      toastTitle: errorToastTitle,
      inline: inlineError,
    })
    throw new ApiRequestError(parsed, display)
  }
  return result.data
}

export function applyApiFetchFailure(
  failure: ApiFetchFailure,
  handlers: {
    toastError: (title: string, message?: string) => void
    toastWarning: (title: string, message?: string) => void
    loginRedirectPath?: string
    toastTitle?: string
  }
): void {
  const display = formatApiError(apiFetchFailureToParsed(failure), {
    toastTitle: handlers.toastTitle,
    inline: false,
  })
  applyApiErrorDisplay(display, handlers)
}

export function applyApiErrorDisplay(
  display: ChatApiErrorDisplay,
  handlers: {
    toastError: (title: string, message?: string) => void
    toastWarning: (title: string, message?: string) => void
    loginRedirectPath?: string
  }
): void {
  if (display.redirectToLogin && handlers.loginRedirectPath) {
    handlers.toastWarning(display.toastTitle, display.toastMessage)
    window.location.href = `/login?redirect_url=${encodeURIComponent(handlers.loginRedirectPath)}`
    return
  }
  if (display.toastTitle) {
    handlers.toastError(display.toastTitle, display.toastMessage)
  }
}

export function apiField<T>(data: ApiJson, key: string): T | undefined {
  const value = data[key]
  return value as T | undefined
}

export function requireApiField<T>(data: ApiJson, key: string, label?: string): T {
  const value = data[key]
  if (value === undefined || value === null) {
    throw new Error(label ?? `Missing ${key} in API response`)
  }
  return value as T
}
