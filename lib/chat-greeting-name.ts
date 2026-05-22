import { DEFAULT_PERSONA_NAME } from '@/lib/persona-constants'

const NAME_FALLBACK = 'there'

/** In-chat name: persona identity first, then profile display name. Client-safe. */
export function resolveChatGreetingName(opts: {
  userDisplayName?: string
  personaName?: string
}): string {
  const persona = opts.personaName?.trim()
  const display = opts.userDisplayName?.trim()
  if (persona && persona !== DEFAULT_PERSONA_NAME) return persona
  if (display) return display
  return NAME_FALLBACK
}
