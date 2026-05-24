'use client'

import { useCallback, useState } from 'react'
import type { Message } from './chat-types'

export function useChatImage(
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
  stickBottomRef: React.MutableRefObject<boolean>,
  refreshQuota?: () => void
) {
  const [showImagePanel, setShowImagePanel] = useState(false)
  const [prefilledRequest, setPrefilledRequest] = useState('')
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null)

  const openImagePanel = useCallback((prefill = '') => {
    setPrefilledRequest(prefill)
    setShowImagePanel(true)
  }, [])

  const closeImagePanel = useCallback(() => {
    setShowImagePanel(false)
    setPrefilledRequest('')
  }, [])

  const handleImageMessageSent = useCallback(
    (message: Message) => {
      stickBottomRef.current = true
      setMessages((prev) => [...prev, message])
      refreshQuota?.()
    },
    [setMessages, stickBottomRef, refreshQuota]
  )

  return {
    showImagePanel,
    prefilledRequest,
    fullscreenImage,
    setFullscreenImage,
    openImagePanel,
    closeImagePanel,
    handleImageMessageSent,
  }
}
