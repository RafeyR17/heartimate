/** CSS variable on `#chat-immersive-container` for overlays above the composer (scroll FAB). */
export const CHAT_OVERLAY_BOTTOM_VAR = '--chat-overlay-bottom'

const DEFAULT_OVERLAY_BOTTOM_PX = 88

/**
 * Sets `--chat-overlay-bottom` from the composer bar position vs visualViewport
 * so fixed overlays sit above the keyboard on mobile.
 */
export function syncChatOverlayBottom(container: HTMLElement | null): void {
  if (typeof window === 'undefined') return

  const bar = document.getElementById('chat-input-bar')
  const vv = window.visualViewport

  if (!bar || !vv) {
    container?.style.setProperty(CHAT_OVERLAY_BOTTOM_VAR, `${DEFAULT_OVERLAY_BOTTOM_PX}px`)
    return
  }

  const barTop = bar.getBoundingClientRect().top
  const gap = 12
  const bottomPx = Math.max(DEFAULT_OVERLAY_BOTTOM_PX, vv.height - barTop + gap)

  container?.style.setProperty(CHAT_OVERLAY_BOTTOM_VAR, `${Math.round(bottomPx)}px`)
}
