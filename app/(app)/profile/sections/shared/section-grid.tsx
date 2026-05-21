'use client'

import type { ReactNode } from 'react'

export function SectionGrid<T>({
  title,
  viewAllLabel,
  onViewAll,
  empty,
  items,
  renderItem,
}: {
  title: string
  viewAllLabel: string
  onViewAll: () => void
  empty: ReactNode
  items: T[]
  renderItem: (item: T) => ReactNode
}) {
  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-body font-semibold text-[16px] text-white">{title}</h2>
        {items.length > 0 && (
          <button
            type="button"
            onClick={onViewAll}
            className="font-body text-[13px] text-[#e8507a] hover:text-[#e8507a]/80"
          >
            {viewAllLabel}
          </button>
        )}
      </div>
      {items.length === 0 ? (
        empty
      ) : (
        <div className="grid grid-cols-2 gap-3 md:gap-4">{items.map(renderItem)}</div>
      )}
    </section>
  )
}
