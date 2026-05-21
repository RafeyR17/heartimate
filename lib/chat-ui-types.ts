import type { Persona } from '@/lib/personas'
import type { MessageRow } from '@/lib/api-contract'

/** UI chat message — same shape as API `MessageRow`. */
export type Message = MessageRow

export interface ChatCharacter {
  id: string
  name: string
  avatar_url: string
  description: string
  tags: string[]
  is_nsfw: boolean
  personality: string
  greeting: string
}

export interface ChatClientProps {
  chatId: string
  character: ChatCharacter
  persona: Persona | null
  initialMessages: Message[]
  initialHasMore?: boolean
  initialOlderCursor?: string | null
  initialTitle: string | null
  userDisplayName: string
  initialAffectionScore: number
  initialRelationshipLevel: string
}

export const DEFAULT_PERSONA_AVATAR =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%231a0e1c"/><circle cx="50" cy="35" r="20" fill="%23e8507a" opacity="0.4"/></svg>'

export const REACTION_KEYS = ['🔥', '💕', '😮'] as const
