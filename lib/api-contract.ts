/**
 * TypeScript API contract aligned with openapi/heartimate.openapi.json.
 * Import from `@/lib/api-contract` in app and client code.
 */

export const API_OPENAPI_PATH = '/api/openapi' as const

/** JSON envelope for successful API responses */
export type ApiSuccessResponse<T extends Record<string, unknown>> = T & {
  success: true
}

/** JSON envelope for errors */
export type ApiErrorResponse = {
  success: false
  error: string
  /** Machine-readable code — see `API_ERROR_CODES` in `lib/api-error-codes.ts`. */
  code?: string
  retryAfter?: number
}

export type ReportReason =
  | 'Inappropriate content'
  | 'Spam / Low quality'
  | 'Harassment'
  | 'Other'

export const CHAT_STREAM_HEADERS = [
  'x-request-id',
  'X-Special-Reply',
  'X-Level-Up',
  'X-Relationship-Level',
  'X-Relationship-Label',
  'X-Relationship-Color',
  'X-Relationship-Progress',
  'X-Relationship-Score',
  'X-Relationship-Next',
] as const

export type ChatStreamHeader = (typeof CHAT_STREAM_HEADERS)[number]

/** Parsed relationship headers from POST /api/chat stream response */
export type ChatStreamMeta = {
  requestId: string | null
  specialReply: boolean
  levelUp: boolean
  relationshipLevel: string
  relationshipLabel: string
  relationshipColor: string
  relationshipProgress: number
  relationshipScore: number
  relationshipNext: number
}

export function parseChatStreamMeta(headers: Headers): ChatStreamMeta {
  return {
    requestId: headers.get('x-request-id'),
    specialReply: headers.get('X-Special-Reply') === 'true',
    levelUp: headers.get('X-Level-Up') === 'true',
    relationshipLevel: headers.get('X-Relationship-Level') ?? '',
    relationshipLabel: headers.get('X-Relationship-Label') ?? '',
    relationshipColor: headers.get('X-Relationship-Color') ?? '',
    relationshipProgress: Number(headers.get('X-Relationship-Progress') ?? 0),
    relationshipScore: Number(headers.get('X-Relationship-Score') ?? 0),
    relationshipNext: Number(headers.get('X-Relationship-Next') ?? 0),
  }
}

export type ChatPostBody = {
  chatId: string
  content: string
  omitUserPersist?: boolean
}

export type ChatsPostBody = {
  characterId: string
  personaId?: string | null
  skipDefaultPersona?: boolean
}

export type ChatsPostResponse = ApiSuccessResponse<{
  chatId: string
  personaId?: string | null
}>

export type MessageRow = {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

export type MessagesPageResponse = ApiSuccessResponse<{
  messages: MessageRow[]
  hasMore: boolean
  nextCursor: string | null
}>

export type MessagePatchBody = {
  content: string
  truncateAfter?: boolean
}

export type OnboardingStarter = {
  id: string
  name: string
  tag: string
  img: string
  teaser: string
  msg: string
}

export type OnboardingGetResponse = ApiSuccessResponse<{
  starters: OnboardingStarter[]
}>

export type OnboardingPostBody = {
  displayName: string
  kinkPrefs?: string[]
  starterCharId: string
  characterName?: string
}

export type OnboardingPostResponse = ApiSuccessResponse<{ chatId: string }>

export type ReportsPostBody = {
  characterId: string
  reason: ReportReason
  details?: string
}

export type ReportsPostResponse = ApiSuccessResponse<Record<string, never>>
