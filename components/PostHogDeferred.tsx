'use client'

import { useEffect, useRef } from 'react'
import { initPostHog } from '@/lib/posthog-browser'
/**
 * Defers PostHog bundle until after first paint + idle (or first user interaction).
 * Identify runs inside ClerkProviders on auth/app routes only.
 */
export function PostHogDeferred() {
  const started = useRef(false)

  useEffect(() => {
    if (started.current || !process.env.NEXT_PUBLIC_POSTHOG_KEY) return
    started.current = true

    const boot = () => {
      void initPostHog()
    }

    const onInteraction = () => {
      boot()
      window.removeEventListener('pointerdown', onInteraction)
      window.removeEventListener('keydown', onInteraction)
    }

    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(boot, { timeout: 2500 })
    } else {
      setTimeout(boot, 1500)
    }

    window.addEventListener('pointerdown', onInteraction, { once: true, passive: true })
    window.addEventListener('keydown', onInteraction, { once: true })
  }, [])

  return null
}
