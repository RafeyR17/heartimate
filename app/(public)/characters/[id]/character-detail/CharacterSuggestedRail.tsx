'use client'

import Image from 'next/image'
import Link from 'next/link'
import { HorizontalCarousel, carouselSnapItemClass } from '@/components/ui/horizontal-carousel'

const DEFAULT_AVATAR =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%231a0e1c"/><circle cx="50" cy="35" r="20" fill="%23e8507a" opacity="0.4"/><path d="M20 80c0-15 15-25 30-25s30 10 30 25" fill="%23e8507a" opacity="0.4"/></svg>'

export type SuggestedCharacter = {
  id: string
  name: string
  avatar_url: string | null
  tags: string[]
  description: string | null
}

export function CharacterSuggestedSidebar({
  suggested,
}: {
  suggested: SuggestedCharacter[]
}) {
  return (
    <div>
      <p className="font-label text-[10px] uppercase tracking-[0.2em] text-white/40 mb-3">
        Suggested Encounters
      </p>
      <div className="flex flex-col gap-2">
        {suggested.length > 0 ? (
          suggested.map((item) => (
            <Link
              key={item.id}
              href={`/characters/${item.id}`}
              className="group flex gap-3 p-3 rounded-xl hover:bg-white/[0.04] border border-transparent hover:border-white/10 transition-all"
            >
              <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0">
                <Image
                  src={item.avatar_url || DEFAULT_AVATAR}
                  alt={item.name}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                  sizes="48px"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate group-hover:text-rose transition-colors">
                  {item.name}
                </p>
                <p className="text-[11px] text-white/40 truncate mt-0.5">
                  {item.tags.slice(0, 2).join(' · ') || 'Companion'}
                </p>
              </div>
            </Link>
          ))
        ) : (
          <p className="text-xs text-white/40 italic">No suggestions yet.</p>
        )}
      </div>
    </div>
  )
}

export function CharacterSuggestedMobile({
  suggested,
}: {
  suggested: SuggestedCharacter[]
}) {
  if (suggested.length === 0) return null

  return (
    <section className="lg:hidden mt-12 pt-8 border-t border-white/8">
      <p className="font-label text-[10px] uppercase tracking-[0.2em] text-white/40 mb-4">
        You May Also Like
      </p>
      <HorizontalCarousel ariaLabel="Suggested characters" className="pb-2" fadeFrom="#080608">
        {suggested.map((item) => (
          <Link
            key={item.id}
            href={`/characters/${item.id}`}
            className={`${carouselSnapItemClass} w-[140px] rounded-xl overflow-hidden border border-white/10 bg-white/[0.03]`}
          >
            <div className="relative aspect-[3/4] w-full">
              <Image
                src={item.avatar_url || DEFAULT_AVATAR}
                alt={item.name}
                fill
                className="object-cover"
                sizes="140px"
              />
            </div>
            <p className="p-2.5 text-sm font-semibold truncate">{item.name}</p>
          </Link>
        ))}
      </HorizontalCarousel>
    </section>
  )
}
