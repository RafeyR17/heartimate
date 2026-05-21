import { format, isToday, isYesterday } from 'date-fns'

export function formatMessageTooltip(iso: string): string {
  const d = new Date(iso)
  const t = format(d, 'h:mm a')
  if (isToday(d)) return `Today at ${t}`
  if (isYesterday(d)) return `Yesterday at ${t}`
  return `${format(d, 'MMM d')} at ${t}`
}

/** Returns exactly 3 starters based on character tags */
export function getConversationStarters(tags: string[]): string[] {
  const lower = tags.map((x) => x.toLowerCase())
  if (lower.some((x) => x.includes('romance'))) {
    return [
      'Tell me about yourself...',
      "I've been thinking about you.",
      'What do you want from me?',
    ]
  }
  if (lower.some((x) => x.includes('dark fantasy'))) {
    return ['Where am I?', 'Are you dangerous?', "I'm not afraid of you."]
  }
  return ['Hello...', 'Who are you?', 'I found you.']
}
