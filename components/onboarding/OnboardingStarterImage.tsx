'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import {
  ONBOARDING_STARTER_FALLBACK_IMG,
  type OnboardingStarter,
} from '@/lib/onboarding-starter-shared'

type OnboardingStarterImageProps = {
  starter: OnboardingStarter
  isSelected: boolean
}

/** Silently generates a Pollinations avatar when the starter has no custom image. */
export function OnboardingStarterImage({
  starter,
  isSelected,
}: OnboardingStarterImageProps) {
  const [src, setSrc] = useState(starter.img)

  useEffect(() => {
    if (!isSelected || starter.img !== ONBOARDING_STARTER_FALLBACK_IMG) return

    let cancelled = false
    void (async () => {
      try {
        const res = await fetch('/api/generate-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: starter.name,
            description: starter.description,
            tags: starter.tags,
          }),
        })
        const data = (await res.json()) as { success?: boolean; mainUrl?: string }
        if (!cancelled && data.success && data.mainUrl) {
          setSrc(data.mainUrl)
        }
      } catch {
        /* silent fail */
      }
    })()

    return () => {
      cancelled = true
    }
  }, [
    isSelected,
    starter.description,
    starter.img,
    starter.name,
    starter.tags,
  ])

  return (
    <Image
      src={src}
      alt={starter.name}
      fill
      className="object-cover object-top pointer-events-none"
      sizes="(max-width: 768px) 200px, 240px"
      unoptimized={src.includes('pollinations.ai')}
    />
  )
}
