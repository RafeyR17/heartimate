/** Query keys that must never appear on auth page URLs (native form GET fallback). */
const CREDENTIAL_QUERY_KEYS = ['email', 'password'] as const

export function authUrlHasCredentialQuery(searchParams: URLSearchParams): boolean {
  return CREDENTIAL_QUERY_KEYS.some((key) => searchParams.has(key))
}

/** Returns a clean URL (same path, credential params removed) or null if already clean. */
export function stripCredentialQueryFromUrl(url: URL): URL | null {
  if (!authUrlHasCredentialQuery(url.searchParams)) return null
  const clean = new URL(url.toString())
  for (const key of CREDENTIAL_QUERY_KEYS) {
    clean.searchParams.delete(key)
  }
  return clean
}
