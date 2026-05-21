import { vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'

export type MockQueryResult<T = unknown> = {
  data: T | null
  error: { message: string } | null
  count?: number | null
}

type Terminal = () => Promise<MockQueryResult>

/** Minimal PostgREST chain mock for route handler tests. */
export function createQueryChain(terminal: Terminal) {
  const chain: Record<string, unknown> = {}
  const self = () => chain
  for (const method of [
    'select',
    'insert',
    'update',
    'delete',
    'upsert',
    'eq',
    'gte',
    'in',
    'order',
    'limit',
    'lt',
  ]) {
    chain[method] = vi.fn(self)
  }
  chain.single = vi.fn(terminal)
  chain.maybeSingle = vi.fn(terminal)
  ;(chain as { then: typeof Promise.prototype.then }).then = (
    onFulfilled,
    onRejected
  ) => terminal().then(onFulfilled, onRejected)
  return chain
}

export function createMockSupabaseClient(handlers: {
  from?: (table: string) => ReturnType<typeof createQueryChain>
  rpc?: (
    fn: string,
    args: Record<string, unknown>
  ) => Promise<MockQueryResult>
}): SupabaseClient {
  const from = vi.fn((table: string) => {
    if (handlers.from) return handlers.from(table)
    return createQueryChain(async () => ({ data: null, error: null }))
  })
  const rpc = vi.fn(async (fn: string, args: Record<string, unknown>) => {
    if (handlers.rpc) return handlers.rpc(fn, args)
    // Default: rate-limit slot acquired
    if (
      fn === 'try_acquire_api_rate_slot' ||
      fn === 'try_acquire_chat_rate_slot'
    ) {
      return { data: true, error: null }
    }
    return { data: null, error: null }
  })
  return { from, rpc } as unknown as SupabaseClient
}
