import type { SupabaseClient } from '@supabase/supabase-js'
import type { MessageRow } from '@/lib/api-contract'

export const CHAT_MESSAGES_PAGE_DEFAULT = 50
export const CHAT_MESSAGES_PAGE_MAX = 100

/** Full select — requires `20240612_chat_image_messages.sql`. */
export const CHAT_MESSAGE_SELECT_WITH_IMAGE =
  'id, role, content, created_at, message_type, image_url, image_prompt' as const

export const CHAT_MESSAGE_SELECT_LEGACY =
  'id, role, content, created_at' as const

export type PaginatedChatMessages = {
  messages: MessageRow[]
  hasMore: boolean
  nextCursor: string | null
}

export function parseChatMessagesLimit(raw: string | null): number {
  const parsed = parseInt(raw ?? '', 10)
  if (!Number.isFinite(parsed) || parsed < 1) {
    return CHAT_MESSAGES_PAGE_DEFAULT
  }
  return Math.min(parsed, CHAT_MESSAGES_PAGE_MAX)
}

/** Postgres `undefined_column` — migration not applied yet. */
export function isPostgresUndefinedColumn(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  return (error as { code?: string }).code === '42703'
}

type RawMessage = {
  id: string
  role: string
  content: string
  created_at: string
  message_type?: string | null
  image_url?: string | null
  image_prompt?: string | null
}

function mapRawMessages(rows: RawMessage[], limit: number): PaginatedChatMessages {
  const hasMore = rows.length > limit
  const slice = hasMore ? rows.slice(0, limit) : rows
  const messages: MessageRow[] = [...slice].reverse().map((m) => ({
    id: m.id,
    role: (m.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
    content: m.content,
    created_at: m.created_at,
    message_type:
      m.message_type === 'image' || m.message_type === 'system'
        ? m.message_type
        : 'text',
    image_url: m.image_url ?? null,
    image_prompt: m.image_prompt ?? null,
  }))

  return {
    messages,
    hasMore,
    nextCursor: hasMore && messages.length > 0 ? messages[0].id : null,
  }
}

/** Latest page first (desc), returned ascending for the UI. `before` loads older history. */
export async function fetchChatMessagesPage(
  supabase: SupabaseClient,
  chatId: string,
  opts: { limit?: number; before?: string | null } = {}
): Promise<PaginatedChatMessages> {
  const limit = opts.limit ?? CHAT_MESSAGES_PAGE_DEFAULT

  async function runSelect(select: string) {
    let query = supabase.from('messages').select(select).eq('chat_id', chatId)

    if (opts.before) {
      const { data: cursorMsg } = await supabase
        .from('messages')
        .select('created_at')
        .eq('id', opts.before)
        .eq('chat_id', chatId)
        .maybeSingle()

      if (cursorMsg?.created_at) {
        query = query.lt('created_at', cursorMsg.created_at)
      }
    }

    return query.order('created_at', { ascending: false }).limit(limit + 1)
  }

  let { data, error } = await runSelect(CHAT_MESSAGE_SELECT_WITH_IMAGE)

  if (error && isPostgresUndefinedColumn(error)) {
    ;({ data, error } = await runSelect(CHAT_MESSAGE_SELECT_LEGACY))
  }

  if (error) throw error

  return mapRawMessages((data ?? []) as unknown as RawMessage[], limit)
}
