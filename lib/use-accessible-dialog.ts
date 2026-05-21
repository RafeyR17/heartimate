'use client'

import { useEffect, useId, useRef } from 'react'

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

function getFocusables(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true'
  )
}

export function useAccessibleDialog(
  open: boolean,
  onClose: () => void,
  options?: { disabled?: boolean }
) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const triggerRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open || options?.disabled) return

    triggerRef.current = document.activeElement as HTMLElement | null
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const focusTimer = window.setTimeout(() => {
      const panel = dialogRef.current
      if (!panel) return
      getFocusables(panel)[0]?.focus()
    }, 0)

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !options?.disabled) {
        e.preventDefault()
        onClose()
        return
      }
      if (e.key !== 'Tab') return
      const panel = dialogRef.current
      if (!panel) return
      const focusables = getFocusables(panel)
      if (focusables.length === 0) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
      } else if (document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      window.clearTimeout(focusTimer)
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = prevOverflow
      triggerRef.current?.focus({ preventScroll: true })
    }
  }, [open, onClose, options?.disabled])

  return { dialogRef, titleId }
}
