'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Loader2, Plus, Sparkles, User, X } from 'lucide-react'
import type { Persona } from '@/lib/personas'
import { useAccessibleDialog } from '@/lib/use-accessible-dialog'
import { iconTouchClass } from '@/lib/touch-targets'
import { EmptyState } from '@/components/EmptyState'
import { apiFetch, apiField } from '@/lib/api-client'
import {
  getRecentPersonaIds,
  recordRecentPersona,
  sortPersonasByRecent,
} from '@/lib/personas-client'

const ROSE = '#e8507a'
const DEFAULT_AVATAR =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%231a0e1c"/><circle cx="50" cy="35" r="20" fill="%23e8507a" opacity="0.4"/><path d="M20 80c0-15 15-25 30-25s30 10 30 25" fill="%23e8507a" opacity="0.4"/></svg>'

export interface PersonaSelectModalProps {
  open: boolean
  onClose: () => void
  characterId: string
  characterName?: string
  mode?: 'start' | 'switch'
  chatId?: string
  currentPersonaId?: string | null
  onStarted?: (chatId: string) => void
  onSwitched?: (personaId: string | null, persona: Persona | null) => void
}

function PersonaCard({
  persona,
  selected,
  onSelect,
}: {
  persona: Persona
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group relative flex flex-col rounded-2xl border p-4 text-left transition-all duration-300 cursor-pointer ${
        selected
          ? 'border-[#e8507a] bg-[rgba(232,80,122,0.12)] shadow-[0_0_32px_rgba(232,80,122,0.25)] scale-[1.02]'
          : 'border-white/10 bg-white/[0.03] hover:border-[rgba(232,80,122,0.35)] hover:bg-white/[0.05]'
      }`}
    >
      {selected && (
        <>
          <span
            className="absolute -inset-px rounded-2xl pointer-events-none opacity-60"
            style={{
              background:
                'radial-gradient(ellipse at 50% 0%, rgba(232,80,122,0.35), transparent 70%)',
            }}
          />
          <span className="absolute inset-0 rounded-2xl ring-1 ring-[#e8507a]/50 pointer-events-none animate-pulse" />
        </>
      )}
      <div className="relative z-10 flex flex-col items-center text-center gap-3">
        <div
          className={`relative w-16 h-16 rounded-full overflow-hidden border-2 flex-shrink-0 ${
            selected ? 'border-[#e8507a]' : 'border-white/15'
          }`}
        >
          <Image
            src={persona.avatar_url || DEFAULT_AVATAR}
            alt={persona.name}
            fill
            className="object-cover"
            sizes="64px"
          />
        </div>
        <div className="min-w-0 w-full">
          <p className="font-semibold text-[14px] text-white truncate">{persona.name}</p>
          <p className="text-[11px] text-white/45 line-clamp-2 mt-1 leading-relaxed">
            {persona.short_bio || 'No bio yet'}
          </p>
        </div>
      </div>
    </button>
  )
}

export default function PersonaSelectModal({
  open,
  onClose,
  characterId,
  characterName,
  mode = 'start',
  chatId,
  currentPersonaId,
  onStarted,
  onSwitched,
}: PersonaSelectModalProps) {
  const router = useRouter()
  const [personas, setPersonas] = useState<Persona[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [selectedId, setSelectedId] = useState<string | 'none' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [openSnapshot, setOpenSnapshot] = useState(open)
  if (open !== openSnapshot) {
    setOpenSnapshot(open)
    if (open) {
      setSelectedId(currentPersonaId ?? null)
      setLoading(true)
    }
  }

  useEffect(() => {
    if (!open) return
    let cancelled = false
    ;(async () => {
      const result = await apiFetch<{ personas?: Persona[] }>('/api/personas')
      if (cancelled) return
      if (!result.ok) {
        setError(result.error || 'Could not load your personas')
        setLoading(false)
        return
      }
      setPersonas(result.data.personas ?? [])
      setError(null)
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [open])

  const { dialogRef, titleId } = useAccessibleDialog(open, onClose, { disabled: submitting })

  async function handleContinue() {
    if (submitting) return
    setSubmitting(true)
    setError(null)

    const personaId = selectedId === 'none' || selectedId === null ? null : selectedId
    const skipDefaultPersona = selectedId === 'none'

    if (mode === 'switch' && chatId) {
      const result = await apiFetch<{ persona?: Persona | null }>(`/api/chats/${chatId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personaId }),
      })
      if (!result.ok) {
        setError(result.error || 'Failed to switch persona')
        setSubmitting(false)
        return
      }

      if (personaId) recordRecentPersona(personaId)
      onSwitched?.(personaId, result.data.persona ?? null)
      onClose()
      setSubmitting(false)
      return
    }

    const result = await apiFetch<{ chatId?: string; personaId?: string | null }>(
      '/api/chats',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterId,
          personaId,
          skipDefaultPersona,
        }),
      }
    )
    if (!result.ok) {
      setError(result.error || 'Something went wrong. Please try again.')
      setSubmitting(false)
      return
    }

    const newChatId = apiField<string>(result.data, 'chatId')
    const resolvedId = apiField<string | null>(result.data, 'personaId') ?? personaId
    if (resolvedId) recordRecentPersona(resolvedId)

    if (newChatId) {
      onStarted?.(newChatId)
      router.push(`/chat/${newChatId}`)
    } else {
      setError('Something went wrong. Please try again.')
    }
    setSubmitting(false)
  }

  if (!open) return null

  const recentIds = getRecentPersonaIds()
  const { recent, rest } = sortPersonasByRecent(personas, recentIds)
  const isSwitch = mode === 'switch'
  const canContinue = selectedId !== null || isSwitch || personas.length === 0
  const gridPersonas = recent.length > 0 ? rest : personas

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/75 backdrop-blur-md"
        aria-label="Close"
        onClick={() => !submitting && onClose()}
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full sm:max-w-[640px] max-h-[92dvh] sm:max-h-[85vh] overflow-hidden rounded-t-[28px] sm:rounded-[28px] border border-white/10 bg-[#0c080d] shadow-2xl flex flex-col animate-in slide-in-from-bottom sm:fade-in sm:zoom-in-95 duration-300 outline-none"
        style={{ boxShadow: '0 24px 80px rgba(232,80,122,0.15)' }}
      >
        <div className="flex items-start justify-between p-6 pb-4 border-b border-white/5 shrink-0">
            <div>
            <p className="font-label text-[10px] uppercase tracking-[0.25em] text-[#e8507a] mb-2">
              {isSwitch ? '// Switch identity' : '// Before you enter'}
            </p>
            <h2 id={titleId} className="font-heading italic text-2xl sm:text-3xl text-white">
              Who are you today?
            </h2>
            <p className="text-sm text-white/45 mt-2">
              {characterName
                ? `Step into ${characterName}'s world as…`
                : 'Choose your persona or create a new one'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close persona selection"
            className={`${iconTouchClass} rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer -mr-2 -mt-1`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 pt-4 persona-modal-scroll">
          {loading ? (
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-[140px] rounded-2xl bg-white/5 animate-pulse border border-white/5"
                />
              ))}
            </div>
          ) : personas.length === 0 ? (
            <EmptyState
              compact
              icon={<Sparkles className="text-rose" />}
              title="Craft your first identity"
              subtitle="Personas let characters react to who you are — appearance, vibe, and voice."
              action={{ label: 'Create your first persona', href: '/personas/create' }}
            />
          ) : (
            <>
              {recent.length > 0 && (
                <div className="mb-6">
                  <p className="font-label text-[10px] uppercase tracking-[0.2em] text-white/35 mb-3">
                    Recently used
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {recent.map((persona) => (
                      <PersonaCard
                        key={persona.id}
                        persona={persona}
                        selected={selectedId === persona.id}
                        onSelect={() => setSelectedId(persona.id)}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div className="mb-6">
                {recent.length > 0 && (
                  <p className="font-label text-[10px] uppercase tracking-[0.2em] text-white/35 mb-3">
                    All personas
                  </p>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {gridPersonas.map((persona) => (
                    <PersonaCard
                      key={persona.id}
                      persona={persona}
                      selected={selectedId === persona.id}
                      onSelect={() => setSelectedId(persona.id)}
                    />
                  ))}

                  <button
                    type="button"
                    onClick={() => router.push('/personas/create')}
                    className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[#e8507a]/40 bg-[#e8507a]/5 p-4 min-h-[140px] hover:bg-[#e8507a]/10 hover:border-[#e8507a] transition-all cursor-pointer"
                  >
                    <div className="w-12 h-12 rounded-full bg-[#e8507a]/15 flex items-center justify-center">
                      <Plus className="w-6 h-6 text-[#e8507a]" />
                    </div>
                    <span className="text-[12px] font-semibold text-[#e8507a]">
                      Create New Persona
                    </span>
                  </button>
                </div>
              </div>
            </>
          )}

          {!loading && personas.length > 0 && (
            <button
              type="button"
              onClick={() => setSelectedId('none')}
              className={`w-full mt-2 flex items-center gap-3 px-4 py-3.5 rounded-xl border transition-all cursor-pointer ${
                selectedId === 'none'
                  ? 'border-[#e8507a]/50 bg-[#e8507a]/10 text-white'
                  : 'border-white/10 bg-white/[0.02] text-white/60 hover:border-white/20 hover:text-white'
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                <User className="w-5 h-5 text-white/40" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium">Continue without Persona</p>
                <p className="text-[11px] text-white/40">Use your default profile identity</p>
              </div>
            </button>
          )}
        </div>

        <div className="p-6 pt-4 border-t border-white/5 shrink-0 bg-[#0c080d]">
          {error && <p className="text-sm text-red-400 text-center mb-3">{error}</p>}
          <button
            type="button"
            onClick={handleContinue}
            disabled={submitting || (!canContinue && personas.length > 0)}
            className="w-full py-3.5 rounded-2xl font-heading italic text-lg text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all hover:opacity-95 active:scale-[0.99] cursor-pointer"
            style={{
              background: `linear-gradient(135deg, ${ROSE}, #c93d66)`,
              boxShadow: '0 8px 28px rgba(232,80,122,0.35)',
            }}
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {isSwitch ? 'Switching…' : 'Opening chat…'}
              </>
            ) : (
              <>{isSwitch ? 'Apply Persona' : 'Enter the story →'}</>
            )}
          </button>
        </div>
      </div>

      <style jsx global>{`
        .persona-modal-scroll::-webkit-scrollbar {
          width: 6px;
        }
        .persona-modal-scroll::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.08);
          border-radius: 10px;
        }
      `}</style>
    </div>
  )
}
