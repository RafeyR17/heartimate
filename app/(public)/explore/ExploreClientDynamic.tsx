'use client'

import dynamic from 'next/dynamic'
import type { ComponentProps } from 'react'
import type ExploreClient from './ExploreClient'

const ExploreClientLazy = dynamic(() => import('./ExploreClient'), {
  loading: () => (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-[1200px] mx-auto w-full animate-pulse">
      <div className="h-10 bg-white/5 rounded-lg w-64 mb-4" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="aspect-square bg-white/5 rounded-2xl" />
        ))}
      </div>
    </div>
  ),
}) as typeof ExploreClient

export default function ExploreClientDynamic(
  props: ComponentProps<typeof ExploreClient>
) {
  return <ExploreClientLazy {...props} />
}
