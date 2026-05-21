'use client'

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'

const MESSAGES = [
  '"I\'ve been waiting for you in the dark..."',
  '"Do you think you can handle my magic?"',
  '"Let me show you a world without rules."',
  '"Your desires are safe with me, master."',
] as const

function subscribeReducedMotion(onStoreChange: () => void) {
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
  mq.addEventListener('change', onStoreChange)
  return () => mq.removeEventListener('change', onStoreChange)
}

function getReducedMotionSnapshot() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function getReducedMotionServerSnapshot() {
  return false
}

export function HeroTypewriter() {
  const messages = useMemo(() => [...MESSAGES], [])
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot
  )
  const [text, setText] = useState<string>(messages[0])
  const [msgIndex, setMsgIndex] = useState(0)
  const [isDeleting, setIsDeleting] = useState(false)

  const [syncedReduced, setSyncedReduced] = useState(reducedMotion)
  if (reducedMotion !== syncedReduced) {
    setSyncedReduced(reducedMotion)
    setText(messages[msgIndex])
    setIsDeleting(false)
  }

  useEffect(() => {
    if (reducedMotion) return

    const currentMsg = messages[msgIndex]
    let timeoutId: ReturnType<typeof setTimeout>

    if (isDeleting) {
      if (text.length > 0) {
        timeoutId = setTimeout(() => setText(text.slice(0, -1)), 20)
      } else {
        timeoutId = setTimeout(() => {
          setIsDeleting(false)
          setMsgIndex((prev) => (prev + 1) % messages.length)
        }, 0)
      }
    } else if (text.length < currentMsg.length) {
      timeoutId = setTimeout(
        () => setText(currentMsg.slice(0, text.length + 1)),
        50
      )
    } else {
      timeoutId = setTimeout(() => setIsDeleting(true), 3000)
    }

    return () => clearTimeout(timeoutId)
  }, [text, isDeleting, msgIndex, messages, reducedMotion])

  return (
    <span className="font-heading italic text-muted text-lg min-h-[3rem] flex items-center">
      {text}
      {!reducedMotion && (
        <span className="animate-pulse w-1 h-5 bg-rose ml-1 block" aria-hidden />
      )}
    </span>
  )
}
