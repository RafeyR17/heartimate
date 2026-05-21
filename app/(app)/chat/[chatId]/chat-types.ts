export {
  type Message,
  type ChatCharacter,
  type ChatClientProps,
  DEFAULT_PERSONA_AVATAR,
  REACTION_KEYS,
} from '@/lib/chat-ui-types'

export {
  CHAT_UI_MESSAGE_PAGE_SIZE,
  parseMessagesFromApi,
  parseMessagesPageResponse,
  type MessagesPageResponse,
} from '@/lib/chat-messages-client'

/** DB / API may use slightly different role strings */
export function isUserRole(role: unknown): boolean {
  const r = String(role ?? '')
    .trim()
    .toLowerCase()
  return r === 'user' || r === 'human' || r === 'player'
}
