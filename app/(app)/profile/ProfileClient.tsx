'use client'

/**
 * Profile tabs: optimistic UI for deletes, then router.refresh() + prop resync.
 * See docs/CLIENT_EPHEMERAL_STATE.md and lib/profile-server-sync.ts.
 */

import { useCallback, useMemo, useState, useTransition } from 'react'
import Image from 'next/image'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Camera, Pencil } from 'lucide-react'
import { format } from 'date-fns'
import {
  CharactersTab,
  ChatsTab,
  EditProfileModal,
  FavoritesTab,
  OverviewTab,
  PersonasTab,
} from './profile-sections'
import { LogoutButton } from '@/components/LogoutButton'
import { useToast } from '@/components/ToastProvider'
import { apiFetch, applyApiFetchFailure } from '@/lib/api-client'
import { useProfileInvalidate } from '@/lib/query/use-profile-invalidate'
import { profileSnapshotKey } from '@/lib/profile-server-sync'
import type {
  ProfileCharacter,
  ProfileChat,
  ProfileCounts,
  ProfileFavorite,
  ProfileOverviewStats,
  ProfilePersona,
  ProfileUser,
} from '@/lib/profile-types'

const DEFAULT_AVATAR =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%231a0e1c"/><circle cx="50" cy="35" r="20" fill="%23e8507a" opacity="0.4"/><path d="M20 80c0-15 15-25 30-25s30 10 30 25" fill="%23e8507a" opacity="0.4"/></svg>'

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'characters', label: 'My Characters' },
  { id: 'chats', label: 'My Chats' },
  { id: 'favorites', label: 'Favorites' },
  { id: 'personas', label: 'My Personas' },
] as const

type TabId = (typeof TABS)[number]['id']

interface ProfileClientProps {
  user: ProfileUser
  clerkImageUrl: string | null
  characters: ProfileCharacter[]
  chats: ProfileChat[]
  favorites: ProfileFavorite[]
  personas: ProfilePersona[]
  counts: ProfileCounts
  overviewStats: ProfileOverviewStats
}

function TabSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-8 bg-white/5 rounded w-48" />
      <div className="grid grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-2xl border border-white/5 bg-[#0d0a0e] aspect-square" />
        ))}
      </div>
    </div>
  )
}

function tabFromParam(value: string | null): TabId {
  if (value === 'characters' || value === 'chats' || value === 'favorites' || value === 'personas') {
    return value
  }
  return 'overview'
}

function ProfilePageInner(props: ProfileClientProps) {
  const { toast, error: toastError, warning: toastWarning, success: toastSuccess, info: toastInfo } =
    useToast()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const activeTab = tabFromParam(searchParams.get('tab'))
  const [tabLoading, setTabLoading] = useState(false)
  const [profile, setProfile] = useState(props.user)
  const [characters, setCharacters] = useState(props.characters)
  const [chats, setChats] = useState(props.chats)
  const [favorites, setFavorites] = useState(props.favorites)
  const [personas, setPersonas] = useState(props.personas)
  const [counts, setCounts] = useState(props.counts)
  const [editOpen, setEditOpen] = useState(false)
  const [charFilter, setCharFilter] = useState<'all' | 'public' | 'private'>('all')
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set())
  const [syncedSnapshotKey, setSyncedSnapshotKey] = useState(() =>
    profileSnapshotKey({
      user: props.user,
      counts: props.counts,
      characters: props.characters,
      chats: props.chats,
      favorites: props.favorites,
      personas: props.personas,
    })
  )

  const refreshProfile = useProfileInvalidate()

  const currentSnapshotKey = profileSnapshotKey({
    user: props.user,
    counts: props.counts,
    characters: props.characters,
    chats: props.chats,
    favorites: props.favorites,
    personas: props.personas,
  })

  if (currentSnapshotKey !== syncedSnapshotKey) {
    setProfile(props.user)
    setCharacters(props.characters)
    setChats(props.chats)
    setFavorites(props.favorites)
    setPersonas(props.personas)
    setCounts(props.counts)
    setSyncedSnapshotKey(currentSnapshotKey)
  }

  const avatarSrc = profile.avatar_url || props.clerkImageUrl || DEFAULT_AVATAR

  const switchTab = useCallback(
    (tab: TabId) => {
      if (tab === activeTab) return
      setTabLoading(true)
      const params = new URLSearchParams(searchParams.toString())
      if (tab === 'overview') params.delete('tab')
      else params.set('tab', tab)
      const qs = params.toString()
      startTransition(() => {
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
      })
      setTimeout(() => setTabLoading(false), 200)
    },
    [activeTab, pathname, router, searchParams, startTransition]
  )

  const filteredCharacters = useMemo(() => {
    if (charFilter === 'public') return characters.filter((c) => c.is_public)
    if (charFilter === 'private') return characters.filter((c) => !c.is_public)
    return characters
  }, [characters, charFilter])

  const memberSince = format(new Date(profile.created_at), 'MMMM yyyy')

  const handleProfileSaved = (updated: ProfileUser) => {
    setProfile(updated)
    setEditOpen(false)
    toast('Profile saved', 'success')
    refreshProfile()
  }

  const toggleCharacterVisibility = async (char: ProfileCharacter) => {
    const next = !char.is_public
    setCharacters((prev) =>
      prev.map((c) => (c.id === char.id ? { ...c, is_public: next } : c))
    )
    const result = await apiFetch(`/api/characters/${char.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isPublic: next }),
    })
    if (!result.ok) {
      applyApiFetchFailure(result, {
        toastError,
        toastWarning,
        toastTitle: 'Could not update visibility',
      })
      setCharacters((prev) =>
        prev.map((c) => (c.id === char.id ? { ...c, is_public: char.is_public } : c))
      )
      return
    }
    toastSuccess(next ? 'Character is now public' : 'Character is now private')
    refreshProfile()
  }

  const deleteCharacter = async (char: ProfileCharacter) => {
    if (!confirm(`Delete ${char.name}? This cannot be undone.`)) return
    setRemovingIds((s) => new Set(s).add(char.id))
    const result = await apiFetch(`/api/characters/${char.id}`, { method: 'DELETE' })
    if (!result.ok) {
      applyApiFetchFailure(result, {
        toastError,
        toastWarning,
        toastTitle: 'Could not delete character',
      })
      setRemovingIds((s) => {
        const n = new Set(s)
        n.delete(char.id)
        return n
      })
      return
    }
    setTimeout(() => {
        setCharacters((prev) => prev.filter((c) => c.id !== char.id))
        setCounts((c) => ({ ...c, characters: c.characters - 1 }))
        setRemovingIds((s) => {
          const n = new Set(s)
          n.delete(char.id)
          return n
        })
        toastSuccess('Character deleted')
        refreshProfile()
      }, 280)
  }

  const deleteChat = async (chatId: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm('Delete this conversation? All messages will be lost.')) return
    setRemovingIds((s) => new Set(s).add(chatId))
    const result = await apiFetch(`/api/chats/${chatId}`, { method: 'DELETE' })
    if (!result.ok) {
      applyApiFetchFailure(result, {
        toastError,
        toastWarning,
        toastTitle: 'Could not delete chat',
      })
      setRemovingIds((s) => {
        const n = new Set(s)
        n.delete(chatId)
        return n
      })
      return
    }
    setTimeout(() => {
        setChats((prev) => prev.filter((c) => c.id !== chatId))
        setCounts((c) => ({ ...c, chats: c.chats - 1 }))
        setRemovingIds((s) => {
          const n = new Set(s)
          n.delete(chatId)
          return n
        })
        toastSuccess('Chat deleted')
        refreshProfile()
      }, 280)
  }

  const unfavorite = async (fav: ProfileFavorite, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setRemovingIds((s) => new Set(s).add(fav.character.id))
    const result = await apiFetch(`/api/characters/${fav.character.id}/like`, {
      method: 'POST',
    })
    if (!result.ok) {
      applyApiFetchFailure(result, {
        toastError,
        toastWarning,
        toastTitle: 'Could not remove favorite',
      })
      setRemovingIds((s) => {
        const n = new Set(s)
        n.delete(fav.character.id)
        return n
      })
      return
    }
    setTimeout(() => {
        setFavorites((prev) => prev.filter((f) => f.character.id !== fav.character.id))
        setCounts((c) => ({ ...c, favorites: c.favorites - 1 }))
        setRemovingIds((s) => {
          const n = new Set(s)
          n.delete(fav.character.id)
          return n
        })
        toastInfo('Removed from favorites')
        refreshProfile()
      }, 280)
  }

  const deletePersona = async (persona: ProfilePersona) => {
    if (!confirm(`Delete "${persona.name}"?`)) return
    setRemovingIds((s) => new Set(s).add(persona.id))
    const result = await apiFetch(`/api/personas/${persona.id}`, { method: 'DELETE' })
    if (!result.ok) {
      applyApiFetchFailure(result, {
        toastError,
        toastWarning,
        toastTitle: 'Could not delete persona',
      })
    } else {
      setPersonas((prev) => prev.filter((p) => p.id !== persona.id))
      setCounts((c) => ({ ...c, personas: c.personas - 1 }))
      toastSuccess('Persona deleted')
      refreshProfile()
    }
    setRemovingIds((s) => {
      const n = new Set(s)
      n.delete(persona.id)
      return n
    })
  }

  return (
    <div className="min-h-full bg-[#080608] w-full -mx-0 flex flex-col">
      {/* Header */}
      <header
        className="relative w-full border-b border-[rgba(232,80,122,0.1)]"
        style={{
          background:
            'linear-gradient(135deg, rgba(232,80,122,0.08) 0%, #0d0a0e 60%)',
        }}
      >
        <div className="px-4 py-8 md:px-12 md:py-10 flex flex-col md:flex-row md:items-center gap-6 md:gap-8">
          <button
            type="button"
            onClick={() => setEditOpen(true)}
            className="group relative w-24 h-24 mx-auto md:mx-0 rounded-full overflow-hidden shrink-0 border-2 border-[rgba(232,80,122,0.4)] cursor-pointer"
          >
            <Image src={avatarSrc} alt="" fill className="object-cover" sizes="96px" />
            <span className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Camera className="w-6 h-6 text-white" />
            </span>
          </button>

          <div className="flex-1 text-center md:text-left min-w-0">
            <h1 className="font-heading text-[28px] md:text-[32px] text-white leading-tight">
              {profile.display_name}
            </h1>
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              className="font-body text-[14px] text-muted mt-1 block w-full md:w-auto text-center md:text-left hover:text-white/80 transition-colors"
            >
              {profile.bio ? (
                profile.bio
              ) : (
                <span className="italic">Add a bio...</span>
              )}
            </button>
            <p className="font-label text-[11px] tracking-[0.1em] text-white/30 uppercase mt-2">
              Member since {memberSince}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-0 md:flex md:items-center md:shrink-0">
            {[
              { n: counts.chats, label: 'CHATS' },
              { n: counts.characters, label: 'CHARACTERS' },
              { n: counts.favorites, label: 'FAVORITES' },
              { n: counts.personas, label: 'PERSONAS' },
            ].map((stat, i) => (
              <div
                key={stat.label}
                className={`px-4 md:px-6 py-2 md:py-0 text-center md:text-left ${
                  i < 3 ? 'md:border-r md:border-white/[0.08]' : ''
                }`}
              >
                <p className="font-heading text-[24px] md:text-[28px] text-white">{stat.n}</p>
                <p className="font-label text-[10px] tracking-[0.15em] text-white/35 uppercase">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>

          <div className="hidden md:flex flex-col gap-2 shrink-0 self-start">
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-white/[0.12] font-body text-[13px] text-muted hover:border-[rgba(232,80,122,0.4)] hover:text-white transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit Profile
            </button>
            <LogoutButton className="w-auto justify-center border border-white/[0.12] hover:border-white/20 hover:text-rose" />
          </div>
        </div>

        <div className="md:hidden mx-4 mb-4 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setEditOpen(true)}
            className="inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-lg border border-white/[0.12] font-body text-[13px] text-muted"
          >
            <Pencil className="w-3.5 h-3.5" />
            Edit Profile
          </button>
          <LogoutButton className="justify-center border border-white/[0.12] hover:border-white/20 hover:text-rose" />
        </div>
      </header>

      {/* Tabs */}
      <nav className="border-b border-white/[0.06] overflow-x-auto scrollbar-hide">
        <div className="flex min-w-max px-4 md:px-12">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => switchTab(tab.id)}
              className={`px-3 md:px-6 py-2.5 md:py-4 font-body font-medium text-[12px] md:text-[14px] whitespace-nowrap border-b-2 transition-colors duration-200 cursor-pointer ${
                activeTab === tab.id
                  ? 'text-white border-[#e8507a]'
                  : 'text-muted border-transparent hover:text-white/70'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Tab content */}
      <div className="px-4 py-5 md:px-12 md:py-10 flex-1">
        <div className="max-w-[900px] mx-auto w-full">
          {tabLoading || isPending ? (
            <TabSkeleton />
          ) : (
            <>
            {activeTab === 'overview' && (
              <OverviewTab
                chats={chats.slice(0, 5)}
                characters={characters.slice(0, 4)}
                favorites={favorites.slice(0, 4)}
                overviewStats={props.overviewStats}
                memberSince={memberSince}
                onViewTab={switchTab}
              />
            )}
            {activeTab === 'characters' && (
              <CharactersTab
                characters={filteredCharacters}
                filter={charFilter}
                setFilter={setCharFilter}
                totalCount={characters.length}
                removingIds={removingIds}
                onToggleVisibility={toggleCharacterVisibility}
                onDelete={deleteCharacter}
              />
            )}
            {activeTab === 'chats' && (
              <ChatsTab
                chats={chats}
                count={counts.chats}
                removingIds={removingIds}
                onDelete={deleteChat}
              />
            )}
            {activeTab === 'favorites' && (
              <FavoritesTab
                favorites={favorites}
                count={counts.favorites}
                removingIds={removingIds}
                onUnfavorite={unfavorite}
              />
            )}
            {activeTab === 'personas' && (
              <PersonasTab
                personas={personas}
                count={counts.personas}
                removingIds={removingIds}
                onDelete={deletePersona}
              />
            )}
          </>
          )}
        </div>
      </div>

      {editOpen && (
        <EditProfileModal
          user={profile}
          clerkImageUrl={props.clerkImageUrl}
          onClose={() => setEditOpen(false)}
          onSaved={handleProfileSaved}
        />
      )}
    </div>
  )
}

export default function ProfileClient(props: ProfileClientProps) {
  return <ProfilePageInner {...props} />
}
