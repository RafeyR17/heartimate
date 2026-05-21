'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Trash2, User } from 'lucide-react'
import { EmptyState } from '@/components/EmptyState'
import type { ProfilePersona } from '@/lib/profile-types'
import { DEFAULT_AVATAR } from './shared/constants'

export function PersonasTab({
  personas,
  count,
  removingIds,
  onDelete,
}: {
  personas: ProfilePersona[]
  count: number
  removingIds: Set<string>
  onDelete: (p: ProfilePersona) => void
}) {
  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <h2 className="font-body font-semibold text-[18px] text-white">My Personas</h2>
          <span className="font-label text-[11px] px-2 py-0.5 rounded-full bg-white/5 text-muted">
            {count}
          </span>
        </div>
        <Link
          href="/personas/create"
          className="inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-[#e8507a] text-white font-body text-[13px] font-medium"
        >
          Create New →
        </Link>
      </div>

      {personas.length === 0 ? (
        <EmptyState
          icon={<User />}
          title="No personas created"
          subtitle="Create a persona to roleplay as different versions of yourself."
          action={{ label: 'Create persona', href: '/personas/create' }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {personas.map((persona) => (
            <article
              key={persona.id}
              className={`rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 transition-all ${
                removingIds.has(persona.id) ? 'opacity-0' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="relative w-12 h-12 rounded-full overflow-hidden border border-[#e8507a]/30 shrink-0">
                  <Image
                    src={persona.avatar_url || DEFAULT_AVATAR}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="48px"
                  />
                </div>
                <h3 className="font-semibold text-[18px] text-white">{persona.name}</h3>
              </div>
              <p className="font-body text-[13px] text-muted mt-2 line-clamp-2">
                {persona.short_bio || 'No bio yet'}
              </p>
              {persona.appearance && (
                <p className="font-label text-[11px] italic text-white/30 mt-2 line-clamp-2">
                  {(persona.appearance ?? '').slice(0, 60)}
                  {(persona.appearance?.length ?? 0) > 60 ? '…' : ''}
                </p>
              )}
              <div className="flex items-center gap-3 mt-4">
                <Link
                  href={`/personas/${persona.id}/edit`}
                  className="font-body text-[13px] text-muted hover:text-white"
                >
                  Edit →
                </Link>
                <button
                  type="button"
                  onClick={() => onDelete(persona)}
                  className="ml-auto text-white/25 hover:text-red-400 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
