import type { SupabaseClient } from '@supabase/supabase-js'
import type { MessageRow } from '@/lib/api-contract'

export const CHAT_MESSAGES_PAGE_DEFAULT = 50
export const CHAT_MESSAGES_PAGE_MAX = 100

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

/** Latest page first (desc), returned ascending for the UI. `before` loads older history. */
export async function fetchChatMessagesPage(
  supabase: SupabaseClient,
  chatId: string,
  opts: { limit?: number; before?: string | null } = {}
): Promise<PaginatedChatMessages> {
  const limit = opts.limit ?? CHAT_MESSAGES_PAGE_DEFAULT

  let query = supabase
    .from('messages')
    .select('id, role, content, created_at')
    .eq('chat_id', chatId)

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

  const { data, error } = await query
    .order('created_at', { ascending: false })
    .limit(limit + 1)

  if (error) throw error

  type RawMessage = {
    id: string
    role: string
    content: string
    created_at: string
  }
  const rows = (data ?? []) as RawMessage[]
  const hasMore = rows.length > limit
  const slice = hasMore ? rows.slice(0, limit) : rows
  const messages: MessageRow[] = [...slice].reverse().map((m) => ({
    id: m.id,
    role: (m.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
    content: m.content,
    created_at: m.created_at,
  }))

  return {
    messages,
    hasMore,
    nextCursor: hasMore && messages.length > 0 ? messages[0].id : null,
  }
}
