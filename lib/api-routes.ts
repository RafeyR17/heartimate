/**
 * Canonical API route list — keep in sync with app/api/** and openapi/heartimate.openapi.json.
 */
export const API_ROUTES = [
  'GET /api/openapi',
  'GET /api/health',
  'GET /api/cron/purge-rate-events',
  'POST /api/chat',
  'POST /api/chats',
  'PATCH /api/chats/:chatId',
  'DELETE /api/chats/:chatId',
  'GET /api/chats/:chatId/messages',
  'DELETE /api/chats/:chatId/messages',
  'PATCH /api/messages/:messageId',
  'DELETE /api/messages/:messageId',
  'GET /api/onboarding',
  'POST /api/onboarding',
  'POST /api/streak',
  'POST /api/reports',
  'GET /api/personas',
  'POST /api/personas',
  'GET /api/personas/:id',
  'PATCH /api/personas/:id',
  'DELETE /api/personas/:id',
  'POST /api/characters',
  'PATCH /api/characters/:id',
  'DELETE /api/characters/:id',
  'POST /api/characters/:id/fork',
  'POST /api/characters/:id/like',
  'GET /api/users/me',
  'PATCH /api/users/me',
] as const

export type ApiRouteId = (typeof API_ROUTES)[number]
