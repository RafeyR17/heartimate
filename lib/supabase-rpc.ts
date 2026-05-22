/** PostgREST / Supabase client error shape (subset). */
export type SupabaseRpcError = {
  code?: string
  message?: string
  details?: string
  hint?: string
}

/** True when the RPC name is absent from the linked database (migration not applied). */
export function isMissingDbRpc(error: SupabaseRpcError | null | undefined): boolean {
  if (!error) return false
  if (error.code === 'PGRST202') return true
  const msg = `${error.message ?? ''} ${error.details ?? ''}`
  return /Could not find the function/i.test(msg)
}
