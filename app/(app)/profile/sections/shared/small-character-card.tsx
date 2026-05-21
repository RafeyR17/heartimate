'use client'

import Image from 'next/image'
import Link from 'next/link'
import type { ProfileCharacter } from '@/lib/profile-types'

export function SmallCharacterCard({ char }: { char: ProfileCharacter }) {
  return (
    <Link
      href={`/characters/${char.id}`}
      className="rounded-xl border border-white/5 bg-[#0d0a0e] overflow-hidden hover:border-[rgba(232,80,122,0.25)] transition-all"
    >
      <div className="relative aspect-square bg-white/5">
        <Image
          src={char.avatar_url || '/images/characters/lyra.jpg'}
          alt={char.name}
          fill
          className="object-cover object-[center_top]"
          sizes="(max-width:768px) 50vw, 25vw"
        />
      </div>
      <div className="p-2.5">
        <p className="font-body font-semibold text-[13px] text-white truncate">{char.name}</p>
      </div>
    </Link>
  )
}
