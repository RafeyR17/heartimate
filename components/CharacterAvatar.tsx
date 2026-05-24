'use client'

import Image from 'next/image'
import {
  DEFAULT_CHARACTER_AVATAR,
  resolveCharacterImageSrc,
} from '@/lib/safe-image-src'

const TAG_COLORS: Record<string, string> = {
  'Dark Fantasy': '#4a0a6b',
  Romance: '#6b0a2a',
  Cyberpunk: '#0a3d6b',
  Supernatural: '#2a0a6b',
  Historical: '#4a3a0a',
}

type CharacterAvatarProps = {
  name: string
  avatarUrl?: string | null
  tags?: string[]
  className?: string
  sizes?: string
  priority?: boolean
}

export function CharacterAvatar({
  name,
  avatarUrl,
  tags,
  className = 'object-cover object-top',
  sizes = '(max-width: 768px) 50vw, 200px',
  priority,
}: CharacterAvatarProps) {
  const trimmed = avatarUrl?.trim()
  if (!trimmed) {
    return renderInitial(name, tags)
  }

  const resolved = resolveCharacterImageSrc(trimmed)
  const hasRemoteAvatar = resolved !== DEFAULT_CHARACTER_AVATAR

  if (hasRemoteAvatar) {
    const unoptimized =
      resolved.includes('pollinations.ai') ||
      resolved.startsWith('blob:') ||
      resolved.startsWith('data:')

    return (
      <Image
        src={resolved}
        alt={name}
        fill
        className={className}
        sizes={sizes}
        priority={priority}
        unoptimized={unoptimized}
      />
    )
  }

  return renderInitial(name, tags)
}

function renderInitial(name: string, tags?: string[]) {
  const color = tags?.[0] ? TAG_COLORS[tags[0]] ?? '#1a0a2e' : '#1a0a2e'

  return (
    <div
      className="absolute inset-0 flex items-center justify-center"
      style={{
        background: `linear-gradient(160deg, ${color}, rgba(8,6,8,0.9))`,
      }}
      aria-hidden
    >
      <span
        className="font-heading italic text-white/30 select-none"
        style={{ fontSize: 'clamp(2rem, 12vw, 3rem)' }}
      >
        {name.charAt(0).toUpperCase()}
      </span>
    </div>
  )
}
