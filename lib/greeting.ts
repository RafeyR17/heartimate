import { resolveChatGreetingName } from '@/lib/chat-greeting-name'

const NAME_FALLBACK = 'there'

/** Replace [name] in character greetings (case-insensitive). */
export function personalizeGreeting(greeting: string, name: string): string {
  const who = name.trim() || NAME_FALLBACK
  if (!/\[name\]/i.test(greeting)) return greeting
  return greeting.replace(/\[name\]/gi, who)
}

export { resolveChatGreetingName }
