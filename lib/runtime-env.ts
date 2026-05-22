/** Clerk keys present — required for clerkMiddleware and auth() in production. */
export function isClerkConfigured(): boolean {
  return Boolean(
    process.env.CLERK_SECRET_KEY?.trim() &&
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim()
  )
}

/** Service-role Supabase — explore catalog and other public SSR reads. */
export function isSupabaseServiceRoleConfigured(): boolean {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  return Boolean(url?.trim() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim())
}
