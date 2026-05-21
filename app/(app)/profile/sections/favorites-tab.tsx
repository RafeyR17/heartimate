'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Heart } from 'lucide-react'
import { EmptyState } from '@/components/EmptyState'
import type { ProfileFavorite } from '@/lib/profile-types'

export function FavoritesTab({
  favorites,
  count,
  removingIds,
  onUnfavorite,
}: {
  favorites: ProfileFavorite[]
  count: number
  removingIds: Set<string>
  onUnfavorite: (fav: ProfileFavorite, e: React.MouseEvent) => void
}) {
  return (
    <div className="w-full">
      <div className="flex items-center gap-3 mb-6">
        <h2 className="font-body font-semibold text-[18px] text-white">Favorites</h2>
        <span className="font-label text-[11px] px-2 py-0.5 rounded-full bg-white/5 text-muted">
          {count}
        </span>
      </div>

      {favorites.length === 0 ? (
        <EmptyState
          icon={<Heart />}
          title="Nothing saved yet"
          subtitle="Explore characters and save your favorites to find them here."
          action={{ label: 'Explore characters', href: '/explore' }}
        />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {favorites.map((fav) => (
            <div
              key={fav.character.id}
              className={`relative transition-all duration-300 ${
                removingIds.has(fav.character.id) ? 'opacity-0 scale-95' : ''
              }`}
            >
              <Link
                href={`/characters/${fav.character.id}`}
                className="group block rounded-2xl border border-white/5 bg-[#0d0a0e] overflow-hidden hover:border-[rgba(232,80,122,0.25)] hover:-translate-y-1 transition-all flex flex-col"
              >
                <div className="relative aspect-square">
                  <Image
                    src={fav.character.avatar_url || '/images/characters/lyra.jpg'}
                    alt={fav.character.name}
                    fill
                    className="object-cover object-[center_top]"
                    sizes="(max-width:768px) 50vw, 25vw"
                  />
                </div>
                <div className="p-3.5">
                  <h3 className="font-body font-semibold text-[14px] text-white truncate">
                    {fav.character.name}
                  </h3>
                  <p className="font-body text-[12px] text-muted mt-1 line-clamp-2">
                    {fav.character.description}
                  </p>
                </div>
              </Link>
              <button
                type="button"
                onClick={(e) => onUnfavorite(fav, e)}
                className="touch-target absolute top-2 right-2 rounded-full bg-black/50 backdrop-blur flex items-center justify-center text-[#e8507a] hover:bg-black/70 cursor-pointer z-10"
                aria-label="Remove favorite"
              >
                <Heart className="w-4 h-4 fill-current" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
