/** True when a real Supabase project is configured for integration smoke tests. */
export function hasIntegrationEnv(): boolean {
  return (
    process.env.INTEGRATION_TEST === '1' &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY) &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  )
}

export function integrationSkipReason(): string {
  if (process.env.INTEGRATION_TEST !== '1') {
    return 'Set INTEGRATION_TEST=1 to run integration smoke tests'
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return 'Missing NEXT_PUBLIC_SUPABASE_URL'
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return 'Missing SUPABASE_SERVICE_ROLE_KEY'
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return 'Missing NEXT_PUBLIC_SUPABASE_ANON_KEY'
  }
  return ''
}
