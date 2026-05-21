import { vi } from 'vitest'
import { createMockSupabaseClient } from '@/lib/test/mock-supabase'

/** Unit tests use heuristics only; live classifier runs in production and test:llm-eval:live. */
process.env.CHAT_MODERATION_DISABLED = 'true'
/** Unit tests skip daily quota unless a test sets CHAT_DAILY_MESSAGE_LIMIT explicitly. */
process.env.CHAT_DAILY_MESSAGE_LIMIT = '0'

vi.mock('server-only', () => ({}))

const { getServiceRoleClient } = vi.hoisted(() => ({
  getServiceRoleClient: vi.fn(),
}))

vi.mock('@/lib/service-role', () => ({
  getServiceRoleClient,
}))

/** Default: rate/idempotency ledger RPCs succeed in route unit tests. */
getServiceRoleClient.mockImplementation(() =>
  createMockSupabaseClient({
    rpc: async () => ({ data: true, error: null }),
  })
)

export { getServiceRoleClient }
