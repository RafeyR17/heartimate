'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  Check,
  Heart,
  LayoutGrid,
  List,
  MessageCircle,
  Search,
  X,
} from 'lucide-react'
import { useToast } from '@/components/ToastProvider'
import { apiFetch, apiField, applyApiFetchFailure } from '@/lib/api-client'
import type { FavoriteCharacter } from '@/lib/favorites-types'
import { DarkSelect } from '@/components/ui/dark-select'
import { cn } from '@/lib/utils'

const DEFAULT_AVATAR = '/images/characters/lyra.jpg'

const FAVORITES_SORT_OPTIONS = [
  { value: 'recent', label: 'Recently Added' },
  { value: 'popular', label: 'Most Popular' },
  { value: 'name', label: 'Name A-Z' },
] as const
const LONG_PRESS_MS = 500

type ViewMode = 'grid' | 'list'
type SortBy = 'recent' | 'popular' | 'name'

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

function filterAndSort(
  characters: FavoriteCharacter[],
  searchQuery: string,
  filterTag: string,
  sortBy: SortBy
): FavoriteCharacter[] {
  const q = searchQuery.trim().toLowerCase()
  const filtered = characters.filter((c) => {
    const matchesSearch =
      !q ||
      c.name.toLowerCase().includes(q) ||
      (c.description?.toLowerCase().includes(q) ?? false)
    const matchesTag =
      filterTag === 'all' || (c.tags?.includes(filterTag) ?? false)
    return matchesSearch && matchesTag
  })

  if (sortBy === 'popular') {
    return [...filtered].sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0))
  }
  if (sortBy === 'name') {
    return [...filtered].sort((a, b) => a.name.localeCompare(b.name))
  }
  return [...filtered].sort(
    (a, b) => new Date(b.liked_at).getTime() - new Date(a.liked_at).getTime()
  )
}

export default function FavoritesClient({
  initialCharacters,
}: {
  initialCharacters: FavoriteCharacter[]
}) {
  const router = useRouter()
  const {
    success: toastSuccess,
    error: toastError,
    warning: toastWarning,
  } = useToast()

  const [characters, setCharacters] = useState(initialCharacters)
  const [view, setView] = useState<ViewMode>('grid')
  const [sortBy, setSortBy] = useState<SortBy>('recent')
  const [filterTag, setFilterTag] = useState('all')
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkRemoving, setBulkRemoving] = useState(false)
  const [startingChatId, setStartingChatId] = useState<string | null>(null)

  const removedSnapshot = useRef<FavoriteCharacter | null>(null)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const allTags = useMemo(
    () => [...new Set(characters.flatMap((c) => c.tags || []))].sort(),
    [characters]
  )

  const filtered = useMemo(
    () => filterAndSort(characters, searchQuery, filterTag, sortBy),
    [characters, searchQuery, filterTag, sortBy]
  )

  const clearFilters = useCallback(() => {
    setSearchQuery('')
    setFilterTag('all')
    setSortBy('recent')
  }, [])

  const toggleSelected = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const exitSelectionMode = useCallback(() => {
    setSelectionMode(false)
    setSelectedIds(new Set())
  }, [])

  const handleRemove = useCallback(
    async (characterId: string) => {
      const snapshot = characters.find((c) => c.id === characterId)
      if (!snapshot) return

      setRemovingId(characterId)
      removedSnapshot.current = snapshot
      setCharacters((prev) => prev.filter((c) => c.id !== characterId))
      setSelectedIds((prev) => {
        const next = new Set(prev)
        next.delete(characterId)
        return next
      })

      try {
        const result = await apiFetch(`/api/characters/${characterId}/like`, {
          method: 'POST',
        })
        if (!result.ok) {
          throw new Error(result.error)
        }
        toastSuccess('Removed from favorites')
      } catch {
        setCharacters((prev) => {
          if (prev.some((c) => c.id === characterId)) return prev
          return [snapshot, ...prev]
        })
        toastError('Failed to remove', 'Please try again.')
      } finally {
        setRemovingId(null)
        removedSnapshot.current = null
      }
    },
    [characters, toastSuccess, toastError]
  )

  const handleBulkRemove = useCallback(async () => {
    const ids = [...selectedIds]
    if (ids.length === 0) return

    const snapshots = characters.filter((c) => ids.includes(c.id))
    setBulkRemoving(true)
    setCharacters((prev) => prev.filter((c) => !ids.includes(c.id)))
    exitSelectionMode()

    const failed: FavoriteCharacter[] = []
    for (const id of ids) {
      const result = await apiFetch(`/api/characters/${id}/like`, {
        method: 'POST',
      })
      if (!result.ok) {
        const snap = snapshots.find((c) => c.id === id)
        if (snap) failed.push(snap)
      }
    }

    if (failed.length > 0) {
      setCharacters((prev) => {
        const merged = [...prev]
        for (const c of failed) {
          if (!merged.some((m) => m.id === c.id)) merged.unshift(c)
        }
        return merged
      })
      toastError(
        'Some favorites were not removed',
        `${failed.length} item(s) could not be updated.`
      )
    } else {
      toastSuccess(
        ids.length === 1 ? 'Removed from favorites' : `Removed ${ids.length} favorites`
      )
    }
    setBulkRemoving(false)
  }, [selectedIds, characters, exitSelectionMode, toastSuccess, toastError])

  const startChat = useCallback(
    async (characterId: string, e?: React.MouseEvent) => {
      e?.preventDefault()
      e?.stopPropagation()
      if (startingChatId) return
      setStartingChatId(characterId)
      const result = await apiFetch<{ chatId?: string }>('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterId, skipDefaultPersona: true }),
      })
      setStartingChatId(null)
      if (!result.ok) {
        applyApiFetchFailure(result, {
          toastError,
          toastWarning,
          toastTitle: 'Failed to start chat',
        })
        return
      }
      const chatId = apiField<string>(result.data, 'chatId')
      if (chatId) router.push(`/chat/${chatId}`)
      else toastError('Failed to start chat', 'Missing chat id in response.')
    },
    [router, startingChatId, toastError, toastWarning]
  )

  const onCardTouchStart = (id: string) => {
    if (selectionMode) return
    longPressTimer.current = setTimeout(() => {
      setSelectionMode(true)
      setSelectedIds(new Set([id]))
    }, LONG_PRESS_MS)
  }

  const onCardTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  const selectAllFiltered =
    filtered.length > 0 && filtered.every((c) => selectedIds.has(c.id))

  const toggleSelectAll = () => {
    if (selectAllFiltered) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filtered.map((c) => c.id)))
    }
  }

  const showBulkBar = selectionMode && selectedIds.size > 0

  return (
    <div
      className={cn(
        'min-h-full w-full bg-[#080608] flex flex-col',
        showBulkBar && 'pb-[calc(4rem+64px+env(safe-area-inset-bottom,0px))]'
      )}
    >
      {/* Header */}
      <header className="pt-5 px-4 md:pt-10 md:px-12">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p
              className="text-[11px] uppercase tracking-[0.15em] text-rose mb-2"
              style={{ fontFamily: '"DM Mono", ui-monospace, monospace' }}
            >
              // YOUR COLLECTION
            </p>
            <h1
              className="font-heading italic text-white leading-tight"
              style={{ fontSize: 'clamp(32px, 4vw, 48px)' }}
            >
              Favorites
            </h1>
            <p className="font-body font-light text-[14px] text-muted mt-2">
              {characters.length} character{characters.length === 1 ? '' : 's'} saved
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {characters.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (selectionMode) exitSelectionMode()
                  else setSelectionMode(true)
                }}
                className="hidden md:inline-flex min-h-[44px] items-center px-3 rounded-lg border border-white/[0.08] text-[12px] font-body text-white/60 hover:text-white hover:bg-white/5 transition-colors"
              >
                {selectionMode ? 'Done' : 'Select'}
              </button>
            )}
            <div
              className="inline-flex rounded-lg border border-white/[0.08] p-1.5 gap-0"
              role="group"
              aria-label="View mode"
            >
              <button
                type="button"
                aria-pressed={view === 'grid'}
                onClick={() => setView('grid')}
                className={cn(
                  'touch-target flex items-center justify-center rounded-md p-1.5 transition-colors',
                  view === 'grid'
                    ? 'bg-rose text-white'
                    : 'text-white/40 hover:text-white/70'
                )}
              >
                <LayoutGrid className="w-4 h-4" aria-hidden />
              </button>
              <button
                type="button"
                aria-pressed={view === 'list'}
                onClick={() => setView('list')}
                className={cn(
                  'touch-target flex items-center justify-center rounded-md p-1.5 transition-colors',
                  view === 'list'
                    ? 'bg-rose text-white'
                    : 'text-white/40 hover:text-white/70'
                )}
              >
                <List className="w-4 h-4" aria-hidden />
              </button>
            </div>
          </div>
        </div>
      </header>

      {characters.length > 0 && (
        <div className="mt-6 px-4 md:px-12 flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-full md:w-[280px]">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none"
                aria-hidden
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search favorites..."
                className="w-full min-h-[44px] rounded-full border border-white/[0.08] bg-white/[0.04] py-2.5 pl-10 pr-4 font-body text-[13px] text-white placeholder:text-white/35 focus:outline-none focus:border-[rgba(232,80,122,0.3)] transition-colors"
                aria-label="Search favorites"
              />
            </div>

            {selectionMode && (
              <label className="hidden md:flex items-center gap-2 min-h-[44px] cursor-pointer text-[13px] text-white/60 font-body">
                <input
                  type="checkbox"
                  checked={selectAllFiltered}
                  onChange={toggleSelectAll}
                  className="sr-only"
                />
                <span
                  className={cn(
                    'w-5 h-5 rounded border flex items-center justify-center transition-colors',
                    selectAllFiltered
                      ? 'bg-rose border-rose text-white'
                      : 'border-white/20 bg-transparent'
                  )}
                >
                  {selectAllFiltered && <Check className="w-3 h-3" />}
                </span>
                Select all
              </label>
            )}

            <DarkSelect
              value={sortBy}
              onChange={(v) => setSortBy(v as SortBy)}
              options={FAVORITES_SORT_OPTIONS}
              aria-label="Sort favorites"
              className="w-full sm:w-[200px] md:ml-auto"
            />
          </div>

          {allTags.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1 scroll-container -mx-1 px-1">
              <button
                type="button"
                onClick={() => setFilterTag('all')}
                className={cn(
                  'shrink-0 h-7 px-3 rounded-full font-label text-[11px] uppercase tracking-wide transition-colors border',
                  filterTag === 'all'
                    ? 'bg-[rgba(232,80,122,0.15)] border-[rgba(232,80,122,0.4)] text-rose'
                    : 'bg-white/[0.04] border-white/[0.08] text-white/45 hover:text-white/70'
                )}
              >
                All
              </button>
              {allTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setFilterTag(tag)}
                  className={cn(
                    'shrink-0 h-7 px-3 rounded-full font-label text-[11px] uppercase tracking-wide transition-colors border',
                    filterTag === tag
                      ? 'bg-[rgba(232,80,122,0.15)] border-[rgba(232,80,122,0.4)] text-rose'
                      : 'bg-white/[0.04] border-white/[0.08] text-white/45 hover:text-white/70'
                  )}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Content */}
      {characters.length === 0 ? (
        <EmptyCollection onExplore={() => router.push('/explore')} />
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center px-5 py-20">
          <p className="font-heading italic text-[22px] text-white">
            No favorites match your filters.
          </p>
          <button
            type="button"
            onClick={clearFilters}
            className="mt-4 font-body text-[14px] text-rose hover:text-rose/80 min-h-[44px] px-4"
          >
            Clear filters
          </button>
        </div>
      ) : view === 'grid' ? (
        <div
          key="grid"
          className="favorites-view-fade grid grid-cols-2 min-[480px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5 px-4 py-8 md:px-12 md:py-8 md:pb-20"
        >
          {filtered.map((character, index) => (
            <GridCard
              key={character.id}
              character={character}
              index={index}
              removing={removingId === character.id}
              selectionMode={selectionMode}
              selected={selectedIds.has(character.id)}
              onToggleSelect={() => toggleSelected(character.id)}
              onRemove={(e) => {
                e.preventDefault()
                e.stopPropagation()
                void handleRemove(character.id)
              }}
              onNavigate={() => {
                if (!selectionMode) router.push(`/characters/${character.id}`)
                else toggleSelected(character.id)
              }}
              onTouchStart={() => onCardTouchStart(character.id)}
              onTouchEnd={onCardTouchEnd}
            />
          ))}
        </div>
      ) : (
        <div
          key="list"
          className="favorites-view-fade flex flex-col gap-0 px-4 py-8 md:px-12 md:py-8 md:pb-20"
        >
          {filtered.map((character, index) => (
            <ListRow
              key={character.id}
              character={character}
              index={index}
              removing={removingId === character.id}
              selectionMode={selectionMode}
              selected={selectedIds.has(character.id)}
              chatLoading={startingChatId === character.id}
              onToggleSelect={() => toggleSelected(character.id)}
              onRemove={(e) => {
                e.preventDefault()
                e.stopPropagation()
                void handleRemove(character.id)
              }}
              onNavigate={() => {
                if (!selectionMode) router.push(`/characters/${character.id}`)
                else toggleSelected(character.id)
              }}
              onStartChat={(e) => void startChat(character.id, e)}
              onTouchStart={() => onCardTouchStart(character.id)}
              onTouchEnd={onCardTouchEnd}
            />
          ))}
        </div>
      )}

      {showBulkBar && (
        <div
          className="fixed left-0 right-0 z-50 border-t border-[rgba(232,80,122,0.2)] bg-[#1a1520] flex items-center justify-between px-4 md:px-8 min-h-[64px] bottom-[calc(3.75rem+env(safe-area-inset-bottom,0px))] md:bottom-0"
          role="toolbar"
          aria-label="Bulk actions"
        >
          <span className="font-body text-[14px] text-white">
            {selectedIds.size} selected
          </span>
          <button
            type="button"
            disabled={bulkRemoving}
            onClick={() => void handleBulkRemove()}
            className="min-h-[44px] px-5 rounded-full bg-rose text-white font-body text-[13px] font-medium hover:bg-rose/90 disabled:opacity-50 transition-colors"
          >
            Remove all
          </button>
        </div>
      )}
    </div>
  )
}

function EmptyCollection({ onExplore }: { onExplore: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-5 py-20 md:py-[80px]">
      <div className="w-20 h-20 rounded-full bg-[rgba(232,80,122,0.08)] border border-[rgba(232,80,122,0.15)] flex items-center justify-center mb-6">
        <Heart className="w-9 h-9 text-rose" aria-hidden />
      </div>
      <h2 className="font-heading italic text-[28px] text-white">Nothing saved yet.</h2>
      <p className="font-body text-[14px] text-muted max-w-[320px] mt-3 leading-relaxed">
        Explore characters and tap the heart to save them here.
      </p>
      <button
        type="button"
        onClick={onExplore}
        className="mt-6 min-h-[44px] px-8 rounded-full bg-rose text-white font-body font-medium text-[13px] hover:bg-rose/90 transition-colors shadow-[0_0_20px_rgba(232,80,122,0.25)]"
      >
        Explore Characters →
      </button>
    </div>
  )
}

function SelectCheckbox({
  checked,
  onToggle,
  className,
}: {
  checked: boolean
  onToggle: (e: React.MouseEvent) => void
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={checked}
      aria-label={checked ? 'Deselect' : 'Select'}
      className={cn(
        'touch-target absolute top-2 left-2 z-20 w-7 h-7 rounded-full border flex items-center justify-center transition-colors',
        checked
          ? 'bg-rose border-rose text-white'
          : 'bg-[rgba(8,6,8,0.7)] border-white/10 text-transparent hover:border-rose/40',
        className
      )}
    >
      {checked && <Check className="w-3.5 h-3.5" />}
    </button>
  )
}

function GridCard({
  character,
  index,
  removing,
  selectionMode,
  selected,
  onToggleSelect,
  onRemove,
  onNavigate,
  onTouchStart,
  onTouchEnd,
}: {
  character: FavoriteCharacter
  index: number
  removing: boolean
  selectionMode: boolean
  selected: boolean
  onToggleSelect: () => void
  onRemove: (e: React.MouseEvent) => void
  onNavigate: () => void
  onTouchStart: () => void
  onTouchEnd: () => void
}) {
  const extraTags = (character.tags?.length ?? 0) - 2

  return (
    <article
      className={cn(
        'favorites-card-enter group relative rounded-2xl border overflow-hidden bg-[#0d0a0e] cursor-pointer transition-all duration-250',
        selected ? 'border-rose/50' : 'border-white/[0.06] hover:border-[rgba(232,80,122,0.25)] hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(232,80,122,0.1)]',
        removing && 'favorites-removing'
      )}
      style={{ animationDelay: `${index * 50}ms` }}
      onClick={onNavigate}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
    >
      {selectionMode && (
        <SelectCheckbox
          checked={selected}
          onToggle={(e) => {
            e.stopPropagation()
            onToggleSelect()
          }}
        />
      )}

      <div className="relative aspect-[3/4] w-full bg-white/5">
        <Image
          src={character.avatar_url || DEFAULT_AVATAR}
          alt={character.name}
          fill
          className="object-cover object-[center_top]"
          sizes="(max-width:480px) 50vw, (max-width:768px) 33vw, 25vw"
        />
        {character.is_nsfw && (
          <span
            className={cn(
              'absolute top-2 z-10 bg-rose text-white text-[10px] font-label font-bold px-2 py-0.5 rounded-full uppercase',
              selectionMode ? 'left-10' : 'left-2'
            )}
          >
            18+
          </span>
        )}
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove from favorites"
          className={cn(
            'touch-target absolute top-2 right-2 z-10 w-7 h-7 rounded-full border border-white/10 bg-[rgba(8,6,8,0.7)] flex items-center justify-center text-white transition-colors hover:bg-[rgba(232,80,122,0.8)]',
            'max-md:opacity-100 md:opacity-0 md:group-hover:opacity-100'
          )}
        >
          <X className="w-3 h-3" />
        </button>
        <div
          className="absolute inset-x-0 bottom-0 h-[45%] pointer-events-none"
          style={{
            background:
              'linear-gradient(to top, #0d0a0e 0%, rgba(13,10,14,0.8) 30%, transparent 60%)',
          }}
        />
        <div className="absolute inset-x-0 bottom-0 p-3 z-[1]">
          <h3 className="font-body font-semibold text-[14px] text-white truncate">
            {character.name}
          </h3>
          {character.description && (
            <p className="font-body text-[12px] text-muted mt-1 line-clamp-2 leading-snug">
              {character.description}
            </p>
          )}
          {character.tags && character.tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1 mt-2">
              {character.tags.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.06] text-white/30 font-label uppercase"
                >
                  {tag}
                </span>
              ))}
              {extraTags > 0 && (
                <span className="text-[10px] text-muted font-body">+{extraTags}</span>
              )}
            </div>
          )}
          <div className="flex items-center gap-3 mt-2 text-[11px] text-muted font-body">
            <span className="inline-flex items-center gap-1">
              <Heart className="w-2.5 h-2.5 text-rose fill-rose" aria-hidden />
              {formatCount(character.likes_count)}
            </span>
            <span className="inline-flex items-center gap-1">
              <MessageCircle className="w-2.5 h-2.5" aria-hidden />
              {formatCount(character.chat_count)}
            </span>
          </div>
        </div>
      </div>
    </article>
  )
}

function ListRow({
  character,
  index,
  removing,
  selectionMode,
  selected,
  chatLoading,
  onToggleSelect,
  onRemove,
  onNavigate,
  onStartChat,
  onTouchStart,
  onTouchEnd,
}: {
  character: FavoriteCharacter
  index: number
  removing: boolean
  selectionMode: boolean
  selected: boolean
  chatLoading: boolean
  onToggleSelect: () => void
  onRemove: (e: React.MouseEvent) => void
  onNavigate: () => void
  onStartChat: (e: React.MouseEvent) => void
  onTouchStart: () => void
  onTouchEnd: () => void
}) {
  const extraTags = (character.tags?.length ?? 0) - 3

  return (
    <article
      className={cn(
        'favorites-card-enter flex gap-4 p-4 rounded-xl border-b border-white/[0.05] cursor-pointer transition-colors hover:bg-white/[0.03]',
        selected && 'ring-1 ring-rose/40 bg-white/[0.02]',
        removing && 'favorites-removing'
      )}
      style={{ animationDelay: `${index * 50}ms` }}
      onClick={onNavigate}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
    >
      {selectionMode && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onToggleSelect()
          }}
          className={cn(
            'touch-target shrink-0 w-7 h-7 mt-1 rounded-full border flex items-center justify-center',
            selected ? 'bg-rose border-rose text-white' : 'border-white/15 bg-white/5'
          )}
          aria-pressed={selected}
        >
          {selected && <Check className="w-3.5 h-3.5" />}
        </button>
      )}

      <div className="relative w-[72px] h-24 shrink-0 rounded-[10px] overflow-hidden bg-white/5">
        <Image
          src={character.avatar_url || DEFAULT_AVATAR}
          alt=""
          fill
          className="object-cover object-[center_top]"
          sizes="72px"
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-body font-semibold text-[16px] text-white truncate">
            {character.name}
          </h3>
          {character.is_nsfw && (
            <span className="shrink-0 bg-rose text-white text-[10px] font-label font-bold px-2 py-0.5 rounded-full uppercase">
              18+
            </span>
          )}
        </div>
        {character.description && (
          <p className="font-body text-[14px] text-muted mt-1.5 line-clamp-2">
            {character.description}
          </p>
        )}
        {character.tags && character.tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1 mt-2">
            {character.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.06] text-white/30 font-label uppercase"
              >
                {tag}
              </span>
            ))}
            {extraTags > 0 && (
              <span className="text-[10px] text-muted font-body">+{extraTags}</span>
            )}
          </div>
        )}
        {character.creator_display_name && (
          <p className="font-body text-[11px] text-white/30 mt-2">
            by {character.creator_display_name}
          </p>
        )}
        <div className="flex items-center gap-3 mt-1.5 text-[12px] text-muted font-body">
          <span className="inline-flex items-center gap-1">
            <Heart className="w-3 h-3 text-rose fill-rose" aria-hidden />
            {formatCount(character.likes_count)}
          </span>
          <span className="inline-flex items-center gap-1">
            <MessageCircle className="w-3 h-3" aria-hidden />
            {formatCount(character.chat_count)}
          </span>
        </div>
      </div>

      <div
        className="flex flex-col items-end justify-center gap-2 shrink-0"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onRemove}
          className="touch-target inline-flex items-center gap-1 min-h-[44px] px-2 rounded-lg font-body text-[12px] text-white/50 hover:text-rose transition-colors"
        >
          Remove
          <X className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          disabled={chatLoading}
          onClick={onStartChat}
          className="touch-target min-h-[44px] px-3.5 rounded-full bg-rose text-white font-body text-[12px] font-medium hover:bg-rose/90 disabled:opacity-50 transition-colors"
        >
          {chatLoading ? '…' : 'Chat →'}
        </button>
      </div>
    </article>
  )
}
