'use client'

import type { ReactNode } from 'react'

export function StatCard({ title, content }: { title: string; content: ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-[#0d0a0e] p-5">
      <p className="font-label text-[10px] uppercase tracking-[0.15em] text-white/35 mb-3">{title}</p>
      {content}
    </div>
  )
}
