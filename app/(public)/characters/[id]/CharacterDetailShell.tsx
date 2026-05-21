'use client'

import dynamic from 'next/dynamic'
import type { ComponentProps } from 'react'
import { CharacterDetailSkeleton } from './character-detail/CharacterDetailSkeleton'

const CharacterDetailClient = dynamic(() => import('./CharacterDetailClient'), {
  loading: () => <CharacterDetailSkeleton />,
})

type CharacterDetailShellProps = ComponentProps<typeof CharacterDetailClient>

export default function CharacterDetailShell(props: CharacterDetailShellProps) {
  return <CharacterDetailClient {...props} />
}
