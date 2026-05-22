'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  Eye,
  Heart,
  MessageCircle,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { useToast } from '@/components/ToastProvider'
import { apiFetch, applyApiFetchFailure } from '@/lib/api-client'
import type { ProfileCharacter } from '@/lib/profile-types'
import { DarkSelect } from '@/components/ui/dark-select'
import { cn } from '@/lib/utils'

const DEFAULT_AVATAR = '/images/characters/lyra.jpg'

const MY_CHARACTERS_SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'likes', label: 'Most Liked' },
  { value: 'chats', label: 'Most Chatted' },
  { value: 'name', label: 'Name A-Z' },
] as const

type VisibilityFilter = 'all' | 'public' | 'private'
type SortBy = 'newest' | 'likes' | 'chats' | 'name'

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

function filterAndSort(
  characters: ProfileCharacter[],
  visibility: VisibilityFilter,
  searchQuery: string,
  sortBy: SortBy
): ProfileCharacter[] {
  const q = searchQuery.trim().toLowerCase()
  let list = characters.filter((c) => {
    const matchesVisibility =
      visibility === 'all' ||
      (visibility === 'public' ? c.is_public : !c.is_public)
    const matchesSearch = !q || c.name.toLowerCase().includes(q)
    return matchesVisibility && matchesSearch
  })

  switch (sortBy) {
    case 'likes':
      list = [...list].sort((a, b) => (b.likes_count ?? 0) - (a.likes_count ?? 0))
      break
    case 'chats':
      list = [...list].sort((a, b) => (b.chat_count ?? 0) - (a.chat_count ?? 0))
      break
    case 'name':
      list = [...list].sort((a, b) => a.name.localeCompare(b.name))
      break
    default:
      list = [...list].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
  }
  return list
}

export default function MyCharactersClient({
  initialCharacters,
}: {
  initialCharacters: ProfileCharacter[]
}) {
  const {
    success: toastSuccess,
    error: toastError,
    warning: toastWarning,
  } = useToast()

  const [characters, setCharacters] = useState(initialCharacters)
  const [visibility, setVisibility] = useState<VisibilityFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortBy>('newest')
  const [removingId, setRemovingId] = useState<string | null>(null)

  const filtered = useMemo(
    () => filterAndSort(characters, visibility, searchQuery, sortBy),
    [characters, visibility, searchQuery, sortBy]
  )

  const counts = useMemo(
    () => ({
      all: characters.length,
      public: characters.filter((c) => c.is_public).length,
      private: characters.filter((c) => !c.is_public).length,
    }),
    [characters]
  )

  const handleDelete = async (char: ProfileCharacter) => {
    if (!confirm(`Delete "${char.name}"? This cannot be undone.`)) return

    setRemovingId(char.id)
    const snapshot = char
    setCharacters((prev) => prev.filter((c) => c.id !== char.id))

    const result = await apiFetch(`/api/characters/${char.id}`, { method: 'DELETE' })
    if (!result.ok) {
      setCharacters((prev) => {
        if (prev.some((c) => c.id === snapshot.id)) return prev
        return [snapshot, ...prev]
      })
      applyApiFetchFailure(result, {
        toastError,
        toastWarning,
        toastTitle: 'Could not delete character',
      })
      setRemovingId(null)
      return
    }

    toastSuccess('Character deleted')
    setRemovingId(null)
  }

  return (
    <div className="min-h-full w-full bg-[#080608] flex flex-col">
      <header className="pt-5 px-4 md:pt-10 md:px-12 border-b border-[rgba(232,80,122,0.08)] pb-8">
        <p
          className="text-[11px] uppercase tracking-[0.15em] text-rose mb-2"
          style={{ fontFamily: '"DM Mono", ui-monospace, monospace' }}
        >
          // YOUR CREATIONS
        </p>
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1
              className="font-heading italic text-white leading-tight"
              style={{ fontSize: 'clamp(28px, 4vw, 40px)' }}
            >
              My Characters
            </h1>
            <p className="font-body font-light text-[14px] text-muted mt-2">
              {characters.length} character{characters.length === 1 ? '' : 's'} in your library
            </p>
          </div>
          <Link
            href="/characters/create"
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-rose px-6 py-2.5 font-body text-[13px] font-medium text-white hover:bg-rose/90 transition-colors shadow-[0_0_24px_rgba(232,80,122,0.3)] shrink-0"
          >
            <Plus className="w-4 h-4" aria-hidden />
            Create New Character
          </Link>
        </div>
      </header>

      {characters.length > 0 && (
        <div className="px-4 md:px-12 py-6 flex flex-col gap-4 border-b border-white/[0.04]">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            <div className="flex gap-2 flex-wrap">
              {(['all', 'public', 'private'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setVisibility(tab)}
                  className={cn(
                    'min-h-[44px] px-4 rounded-full font-body text-[13px] capitalize transition-colors border',
                    visibility === tab
                      ? 'bg-[rgba(232,80,122,0.15)] text-rose border-[rgba(232,80,122,0.4)]'
                      : 'bg-white/[0.04] text-muted border-transparent hover:text-white'
                  )}
                >
                  {tab}
                  <span className="ml-1.5 text-[11px] opacity-70">({counts[tab]})</span>
                </button>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 lg:ml-auto w-full lg:w-auto">
              <div className="relative flex-1 sm:max-w-[280px]">
                <Search
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none"
                  aria-hidden
                />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name..."
                  aria-label="Search characters by name"
                  className="w-full min-h-[44px] rounded-full border border-white/[0.08] bg-white/[0.04] py-2.5 pl-10 pr-4 font-body text-[13px] text-white placeholder:text-white/35 focus:outline-none focus:border-[rgba(232,80,122,0.3)] transition-colors"
                />
              </div>
              <DarkSelect
                value={sortBy}
                onChange={(v) => setSortBy(v as SortBy)}
                options={MY_CHARACTERS_SORT_OPTIONS}
                aria-label="Sort characters"
                className="w-full sm:w-[180px]"
              />
            </div>
          </div>
        </div>
      )}

      {characters.length === 0 ? (
        <EmptyMyCharacters />
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center px-5 py-20">
          <p className="font-heading italic text-[22px] text-white">
            No characters match your filters.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('')
              setVisibility('all')
            }}
            className="mt-4 font-body text-[14px] text-rose hover:text-rose/80 min-h-[44px] px-4"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 px-4 py-8 md:px-12 md:pb-20">
          {filtered.map((char, index) => (
            <CharacterCard
              key={char.id}
              char={char}
              index={index}
              removing={removingId === char.id}
              onDelete={() => void handleDelete(char)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function EmptyMyCharacters() {
  return (
    <div className="flex flex-col items-center justify-center text-center px-5 py-16 md:py-24">
      <div className="relative mb-8">
        <div
          className="w-[120px] h-[120px] rounded-full flex items-center justify-center"
          style={{
            background:
              'radial-gradient(circle at 50% 40%, rgba(232,80,122,0.2) 0%, rgba(13,10,14,0.9) 70%)',
            border: '1px solid rgba(232,80,122,0.2)',
            boxShadow: '0 0 60px rgba(232,80,122,0.15)',
          }}
        >
          <Sparkles className="w-12 h-12 text-rose/80" aria-hidden />
        </div>
        <div className="absolute -bottom-1 -right-2 w-10 h-10 rounded-full border-2 border-[#080608] overflow-hidden bg-[#0d0a0e] shadow-lg">
          <Image
            src="/images/characters/lyra.jpg"
            alt=""
            width={40}
            height={40}
            className="object-cover object-top w-full h-full"
          />
        </div>
      </div>
      <h2 className="font-heading italic text-[28px] text-white max-w-md">
        You haven&apos;t created any characters yet
      </h2>
      <p className="font-body text-[14px] text-muted max-w-[360px] mt-3 leading-relaxed">
        Bring someone to life — personality, voice, and look — then share them with the world or
        keep them private.
      </p>
      <Link
        href="/characters/create"
        className="mt-8 min-h-[44px] inline-flex items-center justify-center gap-2 rounded-full bg-rose px-8 py-3 font-body text-[14px] font-medium text-white hover:bg-rose/90 transition-colors shadow-[0_0_28px_rgba(232,80,122,0.35)]"
      >
        <Plus className="w-4 h-4" aria-hidden />
        Create Your First Character
      </Link>
    </div>
  )
}

function CharacterCard({
  char,
  index,
  removing,
  onDelete,
}: {
  char: ProfileCharacter
  index: number
  removing: boolean
  onDelete: () => void
}) {
  const extraTags = (char.tags?.length ?? 0) - 3

  return (
    <article
      className={cn(
        'my-characters-card-enter group rounded-2xl border border-white/5 bg-[#0d0a0e] overflow-hidden transition-all duration-250 flex flex-col',
        'hover:border-[rgba(232,80,122,0.25)] hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(232,80,122,0.1)]',
        removing && 'opacity-0 scale-95 pointer-events-none'
      )}
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <div className="relative aspect-square bg-white/5">
        <Image
          src={char.avatar_url || DEFAULT_AVATAR}
          alt={char.name}
          fill
          className="object-cover object-[center_top] group-hover:scale-[1.03] transition-transform duration-300"
          sizes="(max-width:768px) 50vw, 25vw"
        />
        {char.is_nsfw && (
          <span className="absolute top-2 left-2 z-10 bg-rose text-white text-[10px] font-label font-bold px-2 py-0.5 rounded-full uppercase">
            18+
          </span>
        )}
        <span
          className={cn(
            'absolute top-2 right-2 z-10 text-[10px] font-label font-bold px-2 py-0.5 rounded-full uppercase',
            char.is_public
              ? 'bg-green-500/20 text-green-400 border border-green-500/20'
              : 'bg-white/10 text-white/55 border border-white/10'
          )}
        >
          {char.is_public ? 'Public' : 'Private'}
        </span>

        <div
          className={cn(
            'absolute inset-0 z-20 flex items-center justify-center gap-2 bg-[rgba(8,6,8,0.72)] backdrop-blur-[2px] transition-opacity duration-200',
            'opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100'
          )}
        >
          <Link
            href={`/characters/${char.id}/edit`}
            className="touch-target flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white hover:bg-rose hover:border-rose transition-colors"
            aria-label={`Edit ${char.name}`}
          >
            <Pencil className="w-4 h-4" />
          </Link>
          <Link
            href={`/characters/${char.id}`}
            className="touch-target flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white hover:bg-rose hover:border-rose transition-colors"
            aria-label={`View ${char.name}`}
          >
            <Eye className="w-4 h-4" />
          </Link>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              onDelete()
            }}
            className="touch-target flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white hover:bg-red-500/90 hover:border-red-400 transition-colors"
            aria-label={`Delete ${char.name}`}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="p-3.5 flex-1 flex flex-col">
        <h3 className="font-body font-semibold text-[14px] text-white truncate">{char.name}</h3>
        {char.description && (
          <p className="font-body text-[12px] text-muted mt-1 line-clamp-2 leading-relaxed">
            {char.description}
          </p>
        )}
        {char.tags && char.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {char.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="font-label text-[10px] bg-white/5 border border-white/5 rounded px-1.5 py-0.5 text-white/40 uppercase"
              >
                {tag}
              </span>
            ))}
            {extraTags > 0 && (
              <span className="font-body text-[10px] text-muted">+{extraTags}</span>
            )}
          </div>
        )}
        <div className="flex items-center gap-3 mt-auto pt-3 text-[11px] text-muted font-body">
          <span className="inline-flex items-center gap-1">
            <Heart className="w-3 h-3 text-rose/80" aria-hidden />
            {formatCount(char.likes_count ?? 0)}
          </span>
          <span className="inline-flex items-center gap-1">
            <MessageCircle className="w-3 h-3" aria-hidden />
            {formatCount(char.chat_count ?? 0)}
          </span>
        </div>
      </div>
    </article>
  )
}
