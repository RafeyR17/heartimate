'use client'

import { useEffect } from 'react'
import { syncChatOverlayBottom } from '@/lib/chat-viewport-sync'

/** Keeps scroll-to-bottom FAB above the composer / keyboard. */
export function useChatViewportSync() {
  useEffect(() => {
    const container = document.getElementById('chat-immersive-container')
    const run = () => syncChatOverlayBottom(container)

    run()
    const vv = window.visualViewport
    vv?.addEventListener('resize', run)
    vv?.addEventListener('scroll', run)
    window.addEventListener('resize', run)

    const bar = document.getElementById('chat-input-bar')
    const ro = bar && typeof ResizeObserver !== 'undefined' ? new ResizeObserver(run) : null
    if (bar && ro) ro.observe(bar)

    return () => {
      vv?.removeEventListener('resize', run)
      vv?.removeEventListener('scroll', run)
      window.removeEventListener('resize', run)
      ro?.disconnect()
      container?.style.removeProperty('--chat-overlay-bottom')
    }
  }, [])
}
