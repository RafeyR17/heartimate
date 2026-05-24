/**
 * Stable machine-readable API error codes (JSON `code` field).
 * Human copy stays in `error`; clients may branch on `code` for i18n / UX.
 */
export const API_ERROR_CODES = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  BAD_REQUEST: 'BAD_REQUEST',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CHAT_NOT_FOUND: 'CHAT_NOT_FOUND',
  MESSAGE_NOT_FOUND: 'MESSAGE_NOT_FOUND',
  CHARACTER_NOT_FOUND: 'CHARACTER_NOT_FOUND',
  PERSONA_NOT_FOUND: 'PERSONA_NOT_FOUND',
  MESSAGE_TOO_LONG: 'MESSAGE_TOO_LONG',
  REQUEST_TOO_LARGE: 'REQUEST_TOO_LARGE',
  RATE_LIMITED: 'RATE_LIMITED',
  /** Daily POST /api/chat quota (beta). */
  DAILY_CHAT_LIMIT: 'daily_chat_limit',
  /** Free-tier daily cap (users.daily_msg_count). */
  QUOTA_EXCEEDED: 'quota_exceeded',
  DUPLICATE_REQUEST: 'DUPLICATE_REQUEST',
  CHAT_DISABLED: 'CHAT_DISABLED',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  MIGRATION_REQUIRED: 'migration_required',
  AI_UNAVAILABLE: 'AI_UNAVAILABLE',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const

export type ApiErrorCode = (typeof API_ERROR_CODES)[keyof typeof API_ERROR_CODES]
