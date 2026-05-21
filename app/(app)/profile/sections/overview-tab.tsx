'use client'

import Image from 'next/image'
import Link from 'next/link'
import { format, formatDistanceToNow } from 'date-fns'
import { Heart, MessageSquare, Sparkles } from 'lucide-react'
import { EmptyState } from '@/components/EmptyState'
import type {
  ProfileCharacter,
  ProfileChat,
  ProfileFavorite,
  ProfileOverviewStats,
} from '@/lib/profile-types'
import type { ProfileTabId } from './shared/types'
import { SectionGrid } from './shared/section-grid'
import { HorizontalCarousel, carouselSnapItemClass } from '@/components/ui/horizontal-carousel'
import { StatCard } from './shared/stat-card'
import { SmallCharacterCard } from './shared/small-character-card'

export function OverviewTab({
  chats,
  characters,
  favorites,
  overviewStats,
  memberSince,
  onViewTab,
}: {
  chats: ProfileChat[]
  characters: ProfileCharacter[]
  favorites: ProfileFavorite[]
  overviewStats: ProfileOverviewStats
  memberSince: string
  onViewTab: (tab: ProfileTabId) => void
}) {
  return (
    <div className="space-y-10 w-full">
      <section>
        <h2 className="font-body font-semibold text-[16px] text-white mb-4">Continue Chatting</h2>
        {chats.length === 0 ? (
          <EmptyState
            compact
            icon={<MessageSquare />}
            title="No chats yet"
            subtitle="Find a character and start your first conversation."
            action={{ label: 'Explore characters', href: '/explore' }}
            className="items-start text-left px-0 py-4"
          />
        ) : (
          <HorizontalCarousel ariaLabel="Recent chats" className="pb-2" fadeFrom="#080608">
            {chats.slice(0, 8).map((chat) => (
              <Link
                key={chat.id}
                href={`/chat/${chat.id}`}
                className={`${carouselSnapItemClass} w-[200px] rounded-xl border border-white/5 overflow-hidden hover:border-[rgba(232,80,122,0.3)] transition-all bg-white/[0.02]`}
              >
                <div className="relative w-full h-[120px] bg-white/5">
                  <Image
                    src={chat.character?.avatar_url || '/images/characters/lyra.jpg'}
                    alt=""
                    fill
                    className="object-cover object-[center_top]"
                    sizes="200px"
                  />
                </div>
                <div className="p-3">
                  <h3 className="font-body font-semibold text-[14px] text-white truncate">
                    {chat.character?.name || 'Unknown'}
                  </h3>
                  {chat.last_message_at && (
                    <p className="font-label text-[10px] text-white/30 uppercase mt-1">
                      {formatDistanceToNow(new Date(chat.last_message_at), { addSuffix: true })}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </HorizontalCarousel>
        )}
      </section>

      <SectionGrid
        title="My Characters"
        viewAllLabel="View all →"
        onViewAll={() => onViewTab('characters')}
        empty={
          <EmptyState
            compact
            icon={<Sparkles />}
            title="No characters yet"
            subtitle="Create your first character and share them with the community."
            action={{ label: 'Create character', href: '/characters/create' }}
            className="items-start text-left px-0 py-2"
          />
        }
        items={characters}
        renderItem={(char) => <SmallCharacterCard key={char.id} char={char} />}
      />

      <SectionGrid
        title="Favorite Characters"
        viewAllLabel="View all →"
        onViewAll={() => onViewTab('favorites')}
        empty={
          <EmptyState
            compact
            icon={<Heart />}
            title="No favorites yet"
            subtitle="Save characters you love while exploring."
            action={{ label: 'Explore characters', href: '/explore' }}
            className="items-start text-left px-0 py-2"
          />
        }
        items={favorites.map((f) => f.character)}
        renderItem={(char) => <SmallCharacterCard key={char.id} char={char} />}
      />

      <section>
        <h2 className="font-body font-semibold text-[16px] text-white mb-4">Quick Stats</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatCard
            title="Most chatted"
            content={
              overviewStats.mostChatted ? (
                <div className="flex items-center gap-3">
                  <div className="relative w-12 h-12 rounded-full overflow-hidden border border-white/10">
                    <Image
                      src={overviewStats.mostChatted.avatar_url || '/images/characters/lyra.jpg'}
                      alt=""
                      fill
                      className="object-cover object-[center_top]"
                      sizes="48px"
                    />
                  </div>
                  <div>
                    <p className="font-body font-semibold text-white text-[14px]">
                      {overviewStats.mostChatted.name}
                    </p>
                    <p className="font-body text-[12px] text-muted">
                      {overviewStats.mostChatted.messageCount} messages
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-[13px] text-muted">No chat activity yet</p>
              )
            }
          />
          <StatCard
            title="Newest character"
            content={
              overviewStats.newestCharacter ? (
                <div>
                  <p className="font-body font-semibold text-white text-[14px]">
                    {overviewStats.newestCharacter.name}
                  </p>
                  <p className="font-body text-[12px] text-muted mt-1">
                    {format(new Date(overviewStats.newestCharacter.created_at), 'MMM d, yyyy')}
                  </p>
                </div>
              ) : (
                <p className="text-[13px] text-muted">No characters yet</p>
              )
            }
          />
          <StatCard
            title="Favorite tag"
            content={
              <p className="font-body text-[14px] text-white">
                {overviewStats.topTag ? (
                  <span className="inline-block px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[12px] uppercase">
                    {overviewStats.topTag}
                  </span>
                ) : (
                  <span className="text-muted text-[13px]">—</span>
                )}
              </p>
            }
          />
          <StatCard
            title="Member since"
            content={
              <div>
                <p className="font-body font-semibold text-white text-[14px]">{memberSince}</p>
                <p className="font-body text-[12px] text-muted mt-1">
                  {overviewStats.memberDays} days as a member
                </p>
              </div>
            }
          />
        </div>
      </section>
    </div>
  )
}
