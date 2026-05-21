'use client'

import dynamic from 'next/dynamic'
import type { CharacterFormProps } from '@/components/character-form/types'

const CharacterForm = dynamic(
  () => import('@/components/CharacterForm').then((m) => m.CharacterForm),
  {
    loading: () => (
      <div className="min-h-screen bg-[#080608] flex items-center justify-center text-white/40 text-sm">
        Loading form…
      </div>
    ),
  }
)

export function CharacterFormDynamic(props: CharacterFormProps) {
  return <CharacterForm {...props} />
}
