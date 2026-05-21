'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { claimAppShellEnterAnimation } from '@/lib/client-storage'
import { cn } from '@/lib/utils'

/**
 * Subtle one-time-per-tab fade when entering the authenticated shell
 * (sidebar + topbar), e.g. after login or first /home visit.
 */
export function AppShellTransition({ children }: { children: ReactNode }) {
  const [entering, setEntering] = useState(claimAppShellEnterAnimation)

  useEffect(() => {
    if (!entering) return
    const t = window.setTimeout(() => setEntering(false), 480)
    return () => window.clearTimeout(t)
  }, [entering])

  return (
    <div
      data-app-shell
      className={cn('flex min-h-[100dvh] bg-[var(--bg)]', entering && 'app-shell-entering')}
    >
      {children}
    </div>
  )
}
