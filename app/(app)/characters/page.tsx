import type { Metadata } from 'next'
import { requireAuthedServerDb } from '@/lib/server-auth'
import { fetchProfileCharacters } from '@/lib/profile-queries'
import MyCharactersClient from './MyCharactersClient'

export const metadata: Metadata = {
  title: 'My Characters',
}

export default async function MyCharactersPage() {
  const { supabase, user } = await requireAuthedServerDb()
  const characters = await fetchProfileCharacters(supabase, user.id)

  return <MyCharactersClient initialCharacters={characters} />
}
