import 'server-only'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { createAuthedDb, type AuthedDb } from '@/lib/authed-db'

/** Authenticated RLS Supabase client for Server Components (app routes). */
export async function requireAuthedServerDb(): Promise<AuthedDb> {
  const { userId } = await auth()
  if (!userId) redirect('/login')

  const authed = await createAuthedDb()
  if (!authed) redirect('/login')

  return authed
}
