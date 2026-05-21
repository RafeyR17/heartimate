import { requireAuthedServerDb } from '@/lib/server-auth'
import PersonasClient from './PersonasClient'



export default async function PersonasPage() {
  const { supabase, user } = await requireAuthedServerDb()

  const { data: personas } = await supabase
    .from('personas')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })

  return <PersonasClient initialPersonas={personas ?? []} />
}
