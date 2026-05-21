'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Loader2, Pencil, Plus, Trash2, User } from 'lucide-react'
import type { Persona } from '@/lib/personas'
import { EmptyState } from '@/components/EmptyState'
import { useToast } from '@/components/ToastProvider'
import { apiFetch, applyApiFetchFailure } from '@/lib/api-client'

const DEFAULT_AVATAR =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%231a0e1c"/><circle cx="50" cy="35" r="20" fill="%23e8507a" opacity="0.4"/><path d="M20 80c0-15 15-25 30-25s30 10 30 25" fill="%23e8507a" opacity="0.4"/></svg>'

export default function PersonasClient({
  initialPersonas,
}: {
  initialPersonas: Persona[]
}) {
  const [personas, setPersonas] = useState(initialPersonas)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const { success, error: toastError, warning: toastWarning } = useToast()

  async function handleDelete(id: string, name: string) {
    if (
      !confirm(
        `Delete "${name}"? Chats using this persona will keep history but lose the persona link.`
      )
    ) {
      return
    }
    setDeletingId(id)
    const result = await apiFetch(`/api/personas/${id}`, { method: 'DELETE' })
    if (!result.ok) {
      applyApiFetchFailure(result, {
        toastError,
        toastWarning,
        toastTitle: 'Could not delete persona',
      })
    } else {
      setPersonas((prev) => prev.filter((p) => p.id !== id))
      success('Persona deleted')
    }
    setDeletingId(null)
  }

  return (
    <div className="px-4 py-6 md:px-8 md:py-10 max-w-[1100px] mx-auto w-full pb-28 md:pb-10">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
        <div>
          <p className="font-label text-[10px] uppercase tracking-[0.25em] text-[#e8507a] mb-2">
            // Your identities
          </p>
          <h1 className="font-heading italic text-3xl md:text-4xl text-white">User Personas</h1>
          <p className="text-sm text-white/45 mt-2 max-w-md">
            Different versions of you — characters react to who you choose to be.
          </p>
        </div>
        <Link
          href="/personas/create"
          className="hidden sm:inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#e8507a] text-white text-sm font-semibold hover:opacity-90 transition-all shadow-[0_0_24px_rgba(232,80,122,0.3)]"
        >
          <Plus className="w-4 h-4" />
          Create New Persona
        </Link>
      </div>

      {personas.length === 0 ? (
        <div className="card-surface overflow-hidden">
          <EmptyState
            icon={<User className="text-rose" />}
            title="Who will you be today?"
            subtitle="Create personas with unique looks and personalities. Switch between them before every chat."
            action={{ label: 'Create your first persona', href: '/personas/create' }}
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-5">
          {personas.map((persona) => (
            <article
              key={persona.id}
              className="group relative rounded-2xl border border-white/8 bg-[#0d0a0e] overflow-hidden hover:border-[rgba(232,80,122,0.35)] hover:shadow-[0_12px_40px_rgba(232,80,122,0.12)] transition-all duration-300"
            >
              <div className="p-5 flex flex-col items-center text-center">
                <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-[#e8507a]/30 mb-4 group-hover:border-[#e8507a] transition-colors">
                  <Image
                    src={persona.avatar_url || DEFAULT_AVATAR}
                    alt={persona.name}
                    fill
                    className="object-cover"
                    sizes="80px"
                  />
                </div>
                <h3 className="font-semibold text-lg text-white">{persona.name}</h3>
                <p className="text-[12px] text-white/45 line-clamp-2 mt-2 min-h-[36px]">
                  {persona.short_bio || 'No bio yet'}
                </p>
                {persona.appearance && (
                  <p className="text-[11px] text-white/35 line-clamp-2 mt-3 italic w-full text-left border-t border-white/5 pt-3">
                    {persona.appearance}
                  </p>
                )}
              </div>

              <div className="flex border-t border-white/5">
                <Link
                  href={`/personas/${persona.id}/edit`}
                  className="flex-1 flex items-center justify-center gap-1.5 py-3 text-[12px] text-white/60 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit
                </Link>
                <button
                  type="button"
                  onClick={() => handleDelete(persona.id, persona.name)}
                  disabled={deletingId === persona.id}
                  className="flex-1 flex items-center justify-center gap-1.5 py-3 text-[12px] text-red-400/80 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {deletingId === persona.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <Link
        href="/personas/create"
        className="fixed bottom-6 right-6 md:bottom-8 md:right-8 z-40 flex items-center gap-2 px-5 py-3.5 rounded-full bg-[#e8507a] text-white font-semibold text-sm shadow-[0_8px_32px_rgba(232,80,122,0.45)] hover:scale-105 active:scale-95 transition-transform sm:hidden"
      >
        <Plus className="w-5 h-5" />
        New Persona
      </Link>
    </div>
  )
}
