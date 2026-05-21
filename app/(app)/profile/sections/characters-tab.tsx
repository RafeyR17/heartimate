'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Eye, EyeOff, Pencil, Sparkles, Trash2 } from 'lucide-react'
import { EmptyState } from '@/components/EmptyState'
import type { ProfileCharacter } from '@/lib/profile-types'

function EmptyCharacters() {
  return (
    <EmptyState
      icon={<Sparkles />}
      title="You haven't created any characters"
      subtitle="Every great character starts with an idea."
      action={{ label: 'Create your first', href: '/characters/create' }}
    />
  )
}

function OwnedCharacterCard({
  char,
  fading,
  onToggleVisibility,
  onDelete,
}: {
  char: ProfileCharacter
  fading: boolean
  onToggleVisibility: () => void
  onDelete: () => void
}) {
  return (
    <article
      className={`rounded-2xl border border-white/[0.07] bg-[#0d0a0e] overflow-hidden transition-all duration-300 ${
        fading ? 'opacity-0 scale-95' : 'opacity-100'
      }`}
    >
      <div className="relative aspect-square">
        <Image
          src={char.avatar_url || '/images/characters/lyra.jpg'}
          alt={char.name}
          fill
          className="object-cover object-[center_top]"
          sizes="(max-width:768px) 100vw, 33vw"
        />
        {char.is_nsfw && (
          <span className="absolute top-2 left-2 bg-[#e8507a] text-white text-[10px] font-label font-bold px-2 py-0.5 rounded-full uppercase">
            18+
          </span>
        )}
        <span
          className={`absolute top-2 right-2 text-[10px] font-label font-bold px-2 py-0.5 rounded-full ${
            char.is_public
              ? 'bg-green-500/20 text-green-400'
              : 'bg-white/10 text-white/50'
          }`}
        >
          {char.is_public ? 'Public' : 'Private'}
        </span>
      </div>
      <div className="p-3.5">
        <h3 className="font-body font-semibold text-[14px] text-white truncate">{char.name}</h3>
        <p className="font-body text-[12px] text-muted mt-1 line-clamp-2">{char.description}</p>
        <div className="flex flex-wrap gap-1 mt-2">
          {(char.tags ?? []).slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="font-label text-[10px] bg-white/5 border border-white/5 rounded px-1.5 py-0.5 text-white/40 uppercase"
            >
              {tag}
            </span>
          ))}
        </div>
        <div className="border-t border-white/[0.06] my-2.5" />
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/characters/${char.id}`}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-white/10 text-[12px] text-muted hover:text-white hover:border-white/20"
          >
            <Pencil className="w-3 h-3" />
            Edit
          </Link>
          <button
            type="button"
            onClick={onToggleVisibility}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-white/10 text-[12px] text-muted hover:text-white cursor-pointer"
          >
            {char.is_public ? (
              <>
                <EyeOff className="w-3 h-3" /> Make Private
              </>
            ) : (
              <>
                <Eye className="w-3 h-3" /> Make Public
              </>
            )}
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[12px] text-white/25 hover:text-red-400 cursor-pointer ml-auto"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    </article>
  )
}

export function CharactersTab({
  characters,
  filter,
  setFilter,
  totalCount,
  removingIds,
  onToggleVisibility,
  onDelete,
}: {
  characters: ProfileCharacter[]
  filter: 'all' | 'public' | 'private'
  setFilter: (f: 'all' | 'public' | 'private') => void
  totalCount: number
  removingIds: Set<string>
  onToggleVisibility: (c: ProfileCharacter) => void
  onDelete: (c: ProfileCharacter) => void
}) {
  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <h2 className="font-body font-semibold text-[18px] text-white">My Characters</h2>
          <span className="font-label text-[11px] px-2 py-0.5 rounded-full bg-white/5 text-muted">
            {totalCount}
          </span>
        </div>
        <Link
          href="/characters/create"
          className="inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-[#e8507a] text-white font-body text-[13px] font-medium hover:bg-[#e8507a]/90 transition-colors"
        >
          Create New →
        </Link>
      </div>

      <div className="flex gap-2 mb-6">
        {(['all', 'public', 'private'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full font-body text-[13px] capitalize transition-colors ${
              filter === f
                ? 'bg-[#e8507a]/15 text-[#e8507a] border border-[#e8507a]/40'
                : 'bg-white/5 text-muted border border-transparent hover:text-white'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {characters.length === 0 ? (
        <EmptyCharacters />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {characters.map((char) => (
            <OwnedCharacterCard
              key={char.id}
              char={char}
              fading={removingIds.has(char.id)}
              onToggleVisibility={() => onToggleVisibility(char)}
              onDelete={() => onDelete(char)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
