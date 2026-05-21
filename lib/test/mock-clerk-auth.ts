import { vi } from 'vitest'
import { auth } from '@clerk/nextjs/server'

/** Point Clerk `auth()` at a live JWT for integration route tests. */
export function mockClerkAuth(
  clerkId: string,
  jwt: string,
  templateJwt: string = jwt
) {
  vi.mocked(auth).mockResolvedValue({
    userId: clerkId,
    getToken: async (opts?: { template?: string }) =>
      opts?.template ? templateJwt : jwt,
  } as Awaited<ReturnType<typeof auth>>)
}
