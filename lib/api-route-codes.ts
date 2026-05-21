import { API_ERROR_CODES } from '@/lib/api-error-codes'

/** Explicit 404 codes for resource-specific API messages. */
export const API_NOT_FOUND = {
  chat: { code: API_ERROR_CODES.CHAT_NOT_FOUND },
  message: { code: API_ERROR_CODES.MESSAGE_NOT_FOUND },
  character: { code: API_ERROR_CODES.CHARACTER_NOT_FOUND },
  persona: { code: API_ERROR_CODES.PERSONA_NOT_FOUND },
} as const
