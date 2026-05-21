import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  OPENROUTER_CHAT_URL,
  openRouterRequestHeaders,
  resolveMemoryModel,
} from '@/lib/llm'
import { sanitizeInput } from '@/lib/prompt'
import { MAX_MEMORY_SUMMARY_CHARS } from '@/lib/chat-route/constants'

export type MemoryLog = {
  info: (event: string, fields?: Record<string, unknown>) => void
  error: (event: string, fields?: Record<string, unknown>) => void
  span?: (
    name: string,
    fn: () => Promise<unknown>
  ) => Promise<unknown>
}

function parseMemorySummaryFromOpenRouter(
  data: unknown,
  log: MemoryLog
): string | null {
  if (!data || typeof data !== 'object') return null
  const record = data as Record<string, unknown>

  if (typeof record.error === 'object' && record.error !== null) {
    log.error('memory.openrouter_error', { error: record.error })
    return null
  }

  const choices = record.choices
  if (!Array.isArray(choices) || choices.length === 0) return null

  const first = choices[0]
  if (!first || typeof first !== 'object') return null

  const message = (first as Record<string, unknown>).message
  if (!message || typeof message !== 'object') return null

  const content = (message as Record<string, unknown>).content
  if (typeof content !== 'string') return null

  const sanitized = sanitizeInput(content).slice(0, MAX_MEMORY_SUMMARY_CHARS)
  return sanitized.length >= 20 ? sanitized : null
}

async function refreshMemoryOnce(
  chatId: string,
  supabase: SupabaseClient,
  messages: Array<{ role: string; content: string }>,
  lastResponse: string,
  log: MemoryLog
): Promise<boolean> {
  const summaryPrompt = `
You are a memory system. 
Summarize this roleplay conversation into 3-5 sentences capturing:
- Key events that happened
- Emotional developments
- Important facts revealed
- Current relationship status

Be concise. This summary will be used as context for future conversations.

Conversation:
${messages
  .slice(-20)
  .map((m) => `${m.role}: ${m.content}`)
  .join('\n')}
Assistant: ${lastResponse}
    `.trim()

  const response = await fetch(OPENROUTER_CHAT_URL, {
    method: 'POST',
    headers: openRouterRequestHeaders(),
    body: JSON.stringify({
      model: resolveMemoryModel(),
      messages: [{ role: 'user', content: summaryPrompt }],
      stream: false,
      max_tokens: 300,
    }),
  })

  if (!response.ok) {
    const errText = await response.text().catch(() => '')
    log.error('memory.openrouter_http_failed', {
      status: response.status,
      body: errText.slice(0, 500),
    })
    return false
  }

  let data: unknown
  try {
    data = await response.json()
  } catch {
    log.error('memory.openrouter_invalid_json', { chatId })
    return false
  }

  const summary = parseMemorySummaryFromOpenRouter(data, log)
  if (!summary) {
    log.error('memory.summary_invalid', { chatId })
    return false
  }

  const { error } = await supabase.from('chat_memory').upsert(
    {
      chat_id: chatId,
      summary,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'chat_id' }
  )

  if (error) {
    log.error('memory.upsert_failed', { chatId, error: error.message })
    return false
  }
  return true
}

export async function updateMemory(
  chatId: string,
  supabase: SupabaseClient,
  messages: Array<{ role: string; content: string }>,
  lastResponse: string,
  log: MemoryLog
): Promise<void> {
  const started = Date.now()
  try {
    let ok = await refreshMemoryOnce(chatId, supabase, messages, lastResponse, log)
    let retried = false
    if (!ok) {
      retried = true
      ok = await refreshMemoryOnce(chatId, supabase, messages, lastResponse, log)
    }
    log.info('memory.refresh', {
      chatId,
      ok,
      retried,
      durationMs: Date.now() - started,
      model: resolveMemoryModel(),
    })
  } catch (err) {
    log.error('memory.update_failed', {
      chatId,
      durationMs: Date.now() - started,
      error: err instanceof Error ? err.message : String(err),
    })
  }
}
