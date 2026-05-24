'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { AvatarImage } from '@/components/ui/avatar-image'
import type { Message } from './chat-types'
import { useChatSession } from './ChatSessionContext'
import { renderMessageContent, ChatMessageStyles } from './message-ui'
import ChatEmptyState from './ChatEmptyState'
import ChatMessageItem from './ChatMessageItem'
import MobileMessageSheet from './MobileMessageSheet'

export default function ChatMessageList() {
  const {
    chatId,
    character,
    messages,
    isStreaming,
    streamingContent,
    showTypingUi,
    specialStream,
    editingMessageId,
    setEditingMessageId,
    setEditInput,
    editTextareaRef,
    stickBottomRef,
    sendMessage,
    handleCopyMessage,
    setPendingDeleteId,
    regenerate,
    hasMoreOlder,
    loadingOlder,
    loadOlderMessages: onLoadOlder,
  } = useChatSession()

  const [mobileSheetMsg, setMobileSheetMsg] = useState<Message | null>(null)
  const [atBottom, setAtBottom] = useState(true)

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const touchStartPos = useRef<{ x: number; y: number } | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const mainScrollRef = useRef<HTMLDivElement>(null)

  const scrollStorageKey = `chat-scroll-${chatId}`
  const isEmptyChat = messages.length === 0 && !isStreaming

  const scrollToBottom = useCallback((smooth: boolean) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' })
  }, [])

  useEffect(() => {
    const el = mainScrollRef.current
    const raw = sessionStorage.getItem(scrollStorageKey)
    if (el && raw) {
      const y = parseInt(raw, 10)
      if (!Number.isNaN(y) && y > 0) {
        requestAnimationFrame(() => {
          el.scrollTop = y
          stickBottomRef.current = false
          setAtBottom(false)
        })
      }
    }
  }, [scrollStorageKey, stickBottomRef])

  useEffect(() => {
    const el = mainScrollRef.current
    if (!el) return
    let t: ReturnType<typeof setTimeout>
    const onScroll = () => {
      const th = 90
      const dist = el.scrollHeight - el.scrollTop - el.clientHeight
      const near = dist < th
      setAtBottom(near)
      stickBottomRef.current = near

      clearTimeout(t)
      t = setTimeout(() => {
        sessionStorage.setItem(scrollStorageKey, String(el.scrollTop))
      }, 500)
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      clearTimeout(t)
      el.removeEventListener('scroll', onScroll)
    }
  }, [scrollStorageKey, stickBottomRef])

  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return
    const handleViewportResize = () => {
      const chatContainer = document.getElementById('chat-immersive-container')
      if (chatContainer && window.visualViewport) {
        chatContainer.style.height = `${window.visualViewport.height}px`
        if (stickBottomRef.current) scrollToBottom(true)
      }
    }
    window.visualViewport.addEventListener('resize', handleViewportResize)
    window.visualViewport.addEventListener('scroll', handleViewportResize)
    handleViewportResize()
    return () => {
      window.visualViewport?.removeEventListener('resize', handleViewportResize)
      window.visualViewport?.removeEventListener('scroll', handleViewportResize)
    }
  }, [scrollToBottom, stickBottomRef])

  useEffect(() => {
    if (editingMessageId && editTextareaRef.current) {
      const ta = editTextareaRef.current
      ta.focus()
      ta.selectionStart = ta.value.length
    }
  }, [editingMessageId, editTextareaRef])

  useEffect(() => {
    if (stickBottomRef.current) {
      scrollToBottom(true)
    }
  }, [messages, streamingContent, isStreaming, scrollToBottom, stickBottomRef])

  const handleLoadOlder = useCallback(async () => {
    if (loadingOlder) return
    const el = mainScrollRef.current
    const prevHeight = el?.scrollHeight ?? 0
    await onLoadOlder()
    requestAnimationFrame(() => {
      if (el) {
        el.scrollTop = el.scrollHeight - prevHeight
      }
    })
  }, [loadingOlder, onLoadOlder])

  const touchHandlers = (msg: Message) => ({
    onTouchStart: (e: React.TouchEvent) => {
      touchStartPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      longPressTimer.current = setTimeout(() => setMobileSheetMsg(msg), 450)
    },
    onTouchMove: (e: React.TouchEvent) => {
      const p = touchStartPos.current
      if (!p) return
      const d = Math.abs(e.touches[0].clientX - p.x) + Math.abs(e.touches[0].clientY - p.y)
      if (d > 12 && longPressTimer.current) {
        clearTimeout(longPressTimer.current)
        longPressTimer.current = null
      }
    },
    onTouchEnd: () => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current)
      longPressTimer.current = null
      touchStartPos.current = null
    },
  })

  return (
    <>
      <main
        ref={mainScrollRef}
        className="flex-1 overflow-y-auto px-2 py-4 sm:px-3 md:px-12 md:p-5 pb-[calc(var(--chat-overlay-bottom,72px)+env(safe-area-inset-bottom))] md:pb-5 flex flex-col gap-2 md:gap-3 scroll-container hide-scrollbar"
      >
        {isEmptyChat && (
          <ChatEmptyState character={character} isStreaming={isStreaming} sendMessage={sendMessage} />
        )}

        {hasMoreOlder && !isEmptyChat && (
          <div className="flex justify-center py-2">
            <button
              type="button"
              onClick={() => void handleLoadOlder()}
              disabled={loadingOlder}
              className="text-[12px] text-white/50 hover:text-white/80 disabled:opacity-40 px-4 min-h-[44px] rounded-full border border-white/10 bg-white/5 transition-colors touch-target"
            >
              {loadingOlder ? 'Loading…' : 'Load older messages'}
            </button>
          </div>
        )}

        {messages.map((msg, index) => (
            <ChatMessageItem
              key={msg.id}
              msg={msg}
              index={index}
              touchHandlers={touchHandlers(msg)}
            />
          ))}

        {isStreaming && streamingContent && (
          <div className="w-full max-w-full sm:max-w-[92%] md:max-w-[75%] self-start flex gap-2 sm:gap-3 min-w-0">
            <div className="relative w-[32px] h-[32px] rounded-full overflow-hidden border border-[#e8507a]/20 flex-shrink-0 flex items-center justify-center bg-gradient-to-br from-[#1a0a20] to-[#2d1040]">
              {character.avatar_url ? (
                <AvatarImage
                  src={character.avatar_url}
                  alt={character.name}
                  fill
                  sizes="32px"
                  className="object-cover object-[center_top]"
                />
              ) : (
                <span className="text-[#e8507a] font-heading italic text-[10px]">AI</span>
              )}
            </div>
            <div
              className={`flex-1 min-w-0 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.07)] rounded-[4px_16px_16px_16px] p-[14px_16px] font-body text-[14px] relative ${specialStream ? 'special-bubble' : ''}`}
            >
              {renderMessageContent(streamingContent)}
              <span className="w-[2px] h-[14px] bg-[#e8507a] inline-block ml-1 align-middle animate-blink" />
            </div>
          </div>
        )}

        {showTypingUi && (
          <div className="w-full max-w-full sm:max-w-[92%] md:max-w-[75%] self-start flex gap-2 sm:gap-3 min-w-0">
            <div className="w-[32px] h-[32px] rounded-full overflow-hidden border border-[#e8507a]/20 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] italic text-white/40 mb-1">{character.name} is typing...</p>
              <div className="bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.07)] rounded-[4px_16px_16px_16px] p-[14px_22px] flex items-center gap-1.5 shadow-md">
                <span className="w-1.5 h-1.5 rounded-full bg-[#e8507a] dot-1" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#e8507a] dot-2" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#e8507a] dot-3" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </main>

      {!atBottom && (
        <button
          type="button"
          onClick={() => {
            stickBottomRef.current = true
            scrollToBottom(true)
            setAtBottom(true)
          }}
          className="touch-target fixed right-3 z-30 rounded-full bg-[#e8507a] shadow-lg text-white transition-opacity duration-200 hover:bg-[#e8507a]/90"
          style={{ bottom: 'var(--chat-overlay-bottom, 70px)' }}
          aria-label="Scroll to bottom"
        >
          <ChevronDown size={22} />
        </button>
      )}

      {mobileSheetMsg && (
        <MobileMessageSheet
          msg={mobileSheetMsg}
          messages={messages}
          isStreaming={isStreaming}
          onClose={() => setMobileSheetMsg(null)}
          onCopy={() => {
            handleCopyMessage(mobileSheetMsg.id, mobileSheetMsg.content)
            setMobileSheetMsg(null)
          }}
          onEdit={() => {
            setEditingMessageId(mobileSheetMsg.id)
            setEditInput(mobileSheetMsg.content)
            setMobileSheetMsg(null)
          }}
          onDelete={() => {
            setPendingDeleteId(mobileSheetMsg.id)
            setMobileSheetMsg(null)
          }}
          onRegenerate={() => {
            setMobileSheetMsg(null)
            regenerate()
          }}
        />
      )}

      <ChatMessageStyles />
    </>
  )
}
