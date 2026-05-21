import type { SidebarChatItem } from '@/lib/app-types'
import type { ChatTurnContext, ChatTurnCharacter, ChatTurnPersona } from '@/lib/chat-turn-context'

function isRecord(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === 'object' && !Array.isArray(v)
}

export function parseSidebarContextRpc(data: unknown): {
  displayName: string
  avatarUrl: string | null
  streakCount: number
  chats: SidebarChatItem[]
} | null {
  if (!isRecord(data) || data.ok !== true) return null

  const chatsRaw = Array.isArray(data.chats) ? data.chats : []
  const chats: SidebarChatItem[] = chatsRaw.flatMap((item) => {
    if (!isRecord(item)) return []
    const character = isRecord(item.character)
      ? {
          name: String(item.character.name ?? ''),
          avatar_url:
            item.character.avatar_url != null
              ? String(item.character.avatar_url)
              : null,
        }
      : null
    const persona =
      isRecord(item.persona) && typeof item.persona.name === 'string'
        ? { name: item.persona.name }
        : null
    return [{ id: String(item.id), character, persona }]
  })

  return {
    displayName: String(data.display_name ?? ''),
    avatarUrl: data.avatar_url != null ? String(data.avatar_url) : null,
    streakCount: Number(data.streak_count ?? 0),
    chats,
  }
}

function parseChatTurnCharacter(raw: Record<string, unknown>): ChatTurnCharacter {
  return {
    id: String(raw.id),
    name: String(raw.name),
    personality: String(raw.personality ?? ''),
    scenario: String(raw.scenario ?? ''),
    greeting: String(raw.greeting ?? ''),
    example_dialogs: String(raw.example_dialogs ?? ''),
    tags: Array.isArray(raw.tags) ? raw.tags.map(String) : [],
    is_nsfw: Boolean(raw.is_nsfw),
  }
}

function parseChatTurnPersona(raw: Record<string, unknown>): ChatTurnPersona {
  return {
    id: String(raw.id),
    name: String(raw.name),
    short_bio: raw.short_bio != null ? String(raw.short_bio) : null,
    appearance: raw.appearance != null ? String(raw.appearance) : null,
    personality: raw.personality != null ? String(raw.personality) : null,
  }
}

export function parseChatTurnContextRpc(data: unknown): ChatTurnContext | null {
  if (!isRecord(data) || data.ok !== true) return null
  if (!isRecord(data.chat) || !isRecord(data.character)) return null

  const chat = data.chat
  const messages = Array.isArray(data.messages) ? data.messages : []
  const personaRaw = isRecord(data.persona) ? data.persona : null

  return {
    chat: {
      id: String(chat.id),
      user_id: String(chat.user_id),
      persona_id: chat.persona_id != null ? String(chat.persona_id) : null,
      affection_score: Number(chat.affection_score ?? 0),
      relationship_level: String(chat.relationship_level ?? 'stranger'),
      total_messages: Number(chat.total_messages ?? 0),
    },
    character: parseChatTurnCharacter(data.character),
    persona: personaRaw ? parseChatTurnPersona(personaRaw) : null,
    messages: messages.flatMap((m) => {
      if (!isRecord(m)) return []
      return [{ role: String(m.role), content: String(m.content ?? '') }]
    }),
    memorySummary:
      data.memory_summary != null ? String(data.memory_summary) : null,
  }
}
