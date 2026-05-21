/**
 * Chat turn persistence strategy (POST /api/chat).
 *
 * **Compensating transaction (chosen):**
 * 1. Rate limit + optional idempotency claim
 * 2. Insert user message BEFORE OpenRouter (skip when omitUserPersist)
 * 3. Stream LLM response
 * 4. On stream start failure → delete user row (rollback)
 * 5. On finalize failure → delete user row + mark idempotency failed
 * 6. finalize_chat_turn RPC atomically inserts assistant + updates chat counters
 *
 * We do NOT call OpenRouter until the user row is committed (when persisting).
 * Regenerate/edit-resend reuses the existing user row (omitUserPersist).
 *
 * Empty assistant replies use ASSISTANT_EMPTY_FALLBACK in finalize.
 */

export const CHAT_TURN_STRATEGY = 'compensating' as const
