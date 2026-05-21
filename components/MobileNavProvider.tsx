'use client'

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

type MobileNavContextValue = {
  open: boolean
  setOpen: (open: boolean) => void
  toggle: () => void
  close: () => void
}

const MobileNavContext = createContext<MobileNavContextValue | null>(null)

export function MobileNavProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])
  const toggle = useCallback(() => setOpen((v) => !v), [])

  const value = useMemo(
    () => ({ open, setOpen, toggle, close }),
    [open, close, toggle]
  )

  return <MobileNavContext.Provider value={value}>{children}</MobileNavContext.Provider>
}

export function useMobileNav() {
  const ctx = useContext(MobileNavContext)
  if (!ctx) {
    throw new Error('useMobileNav must be used within MobileNavProvider')
  }
  return ctx
}
