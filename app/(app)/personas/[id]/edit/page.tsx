import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { requireAuthedServerDb } from '@/lib/server-auth'
import PersonaFormClient from '@/components/personas/PersonaFormClient'

export default async function EditPersonaPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { supabase, user } = await requireAuthedServerDb()

  const { data: persona } = await supabase
    .from('personas')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!persona) notFound()

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#080608] flex items-center justify-center text-white/40 text-sm">
          Loading…
        </div>
      }
    >
      <PersonaFormClient mode="edit" initial={persona} />
    </Suspense>
  )
}
