'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react'

const DRAWER_IDS = ['public-mobile-nav-drawer', 'mobile-nav-drawer'] as const

/** Class on the mobile drawer scrim — stable for SSR/hydration (avoid data-* booleans). */
export const MOBILE_NAV_BACKDROP_CLASS = 'mobile-nav-backdrop'

function shouldRestoreMenuFocus(): boolean {
  if (typeof document === 'undefined') return false
  const active = document.activeElement
  if (!active || !(active instanceof HTMLElement)) return false
  if (active.classList.contains(MOBILE_NAV_BACKDROP_CLASS)) return true
  return DRAWER_IDS.some((id) => document.getElementById(id)?.contains(active))
}

type MobileNavContextValue = {
  open: boolean
  setOpen: (open: boolean) => void
  toggle: () => void
  close: () => void
  /** Attach to the hamburger that opens the slide-out drawer. */
  menuTriggerRef: RefObject<HTMLButtonElement | null>
}

const MobileNavContext = createContext<MobileNavContextValue | null>(null)

export function MobileNavProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const menuTriggerRef = useRef<HTMLButtonElement | null>(null)

  const close = useCallback(() => {
    setOpen((wasOpen) => {
      if (wasOpen && shouldRestoreMenuFocus()) {
        menuTriggerRef.current?.focus({ preventScroll: true })
      }
      return false
    })
  }, [])

  const toggle = useCallback(() => setOpen((v) => !v), [])

  const value = useMemo(
    () => ({ open, setOpen, toggle, close, menuTriggerRef }),
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
