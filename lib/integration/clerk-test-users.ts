import { createClerkClient } from '@clerk/backend'
import { createSupabaseClientWithAccessToken } from '@/lib/supabase-server'
import type { SupabaseClient } from '@supabase/supabase-js'

export const IDOR_TEST_EMAIL_A = 'hm-idor-a+test@example.com'
export const IDOR_TEST_EMAIL_B = 'hm-idor-b+test@example.com'

export type ClerkTestUsers = {
  clerkA: string
  clerkB: string
  appUserA: string
  appUserB: string
  tokenA: string
  tokenB: string
  clientA: SupabaseClient
  clientB: SupabaseClient
}

export function hasClerkIntegrationEnv(): boolean {
  return Boolean(process.env.CLERK_SECRET_KEY)
}

export async function ensureClerkUser(
  clerk: ReturnType<typeof createClerkClient>,
  email: string
): Promise<string> {
  const list = await clerk.users.getUserList({ emailAddress: [email], limit: 1 })
  if (list.data[0]) return list.data[0].id
  const u = await clerk.users.createUser({
    emailAddress: [email],
    password: 'HmIdorTest123!@#',
    skipPasswordChecks: true,
  })
  return u.id
}

export async function mintSupabaseToken(
  clerk: ReturnType<typeof createClerkClient>,
  userId: string
): Promise<string> {
  const session = await clerk.sessions.createSession({ userId })
  try {
    const t = await clerk.sessions.getToken(session.id)
    return t.jwt
  } catch {
    const t = await clerk.sessions.getToken(session.id, 'supabase')
    return t.jwt
  }
}

export async function provisionIdorTestUsers(
  admin: SupabaseClient
): Promise<ClerkTestUsers> {
  const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! })
  const clerkA = await ensureClerkUser(clerk, IDOR_TEST_EMAIL_A)
  const clerkB = await ensureClerkUser(clerk, IDOR_TEST_EMAIL_B)

  const tokenA = await mintSupabaseToken(clerk, clerkA)
  const tokenB = await mintSupabaseToken(clerk, clerkB)

  const { data: rowA } = await admin.from('users').select('id').eq('clerk_id', clerkA).maybeSingle()
  const { data: rowB } = await admin.from('users').select('id').eq('clerk_id', clerkB).maybeSingle()

  const appUserA = rowA?.id ?? `hm-idor-a-${Date.now()}`
  const appUserB = rowB?.id ?? `hm-idor-b-${Date.now()}`

  if (!rowA) {
    await admin.from('users').insert({ id: appUserA, clerk_id: clerkA, display_name: 'IDOR A' })
  }
  if (!rowB) {
    await admin.from('users').insert({ id: appUserB, clerk_id: clerkB, display_name: 'IDOR B' })
  }

  return {
    clerkA,
    clerkB,
    appUserA,
    appUserB,
    tokenA,
    tokenB,
    clientA: createSupabaseClientWithAccessToken(tokenA),
    clientB: createSupabaseClientWithAccessToken(tokenB),
  }
}
