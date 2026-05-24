'use client'

import { useEffect, useRef } from 'react'
import { ArrowUp, Camera, X } from 'lucide-react'
import { iconTouchClass } from '@/lib/touch-targets'
import { syncChatOverlayBottom } from '@/lib/chat-viewport-sync'
import { useChatSession } from './ChatSessionContext'

export default function ChatComposer() {
  const {
    character,
    input,
    setInput,
    sendMessage,
    cancelStream,
    quotaInfo,
    isStreaming,
    openImagePanel,
  } = useChatSession()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = '40px'
    const scrollHeight = textarea.scrollHeight
    textarea.style.height = `${Math.min(Math.max(40, scrollHeight), 160)}px`
  }, [input])

  useEffect(() => {
    const viewport = window.visualViewport
    if (!viewport) return

    function handleResize() {
      const inputBar = document.getElementById('chat-input-bar')
      if (!inputBar) return

      const offsetFromBottom =
        window.innerHeight - viewport!.height - viewport!.offsetTop

      inputBar.style.transform = `translateY(-${Math.max(0, offsetFromBottom)}px)`
      syncChatOverlayBottom(document.getElementById('chat-immersive-container'))
    }

    viewport.addEventListener('resize', handleResize)
    viewport.addEventListener('scroll', handleResize)
    handleResize()

    return () => {
      viewport.removeEventListener('resize', handleResize)
      viewport.removeEventListener('scroll', handleResize)
      const inputBar = document.getElementById('chat-input-bar')
      if (inputBar) inputBar.style.transform = ''
    }
  }, [])

  return (
    <footer
      id="chat-input-bar"
      className="fixed bottom-0 left-0 right-0 z-30 border-t border-white/[0.08] bg-[rgba(8,6,8,0.95)] backdrop-blur-[20px] transition-transform duration-75 md:relative md:transform-none md:flex-shrink-0"
      style={{ paddingBottom: 'calc(8px + env(safe-area-inset-bottom, 0px))' }}
    >
      <div className="w-full flex flex-col gap-1.5 px-2 py-2 sm:px-3 md:max-w-4xl md:mx-auto md:p-4">
        {quotaInfo && (
          <div className="flex items-center gap-2 px-1">
            {quotaInfo.isByok ? (
              <span className="font-body text-[10px] uppercase tracking-wide text-green-400 border border-green-500/25 rounded-full px-2 py-0.5">
                ∞ Unlimited
              </span>
            ) : quotaInfo.remaining === 0 ? (
              <span className="font-body text-[10px] uppercase tracking-wide text-rose border border-rose/30 rounded-full px-2 py-0.5">
                Daily limit reached
              </span>
            ) : quotaInfo.remaining <= 5 ? (
              <span className="font-body text-[10px] uppercase tracking-wide text-amber-400 border border-amber-500/25 rounded-full px-2 py-0.5">
                {quotaInfo.remaining} messages left today
              </span>
            ) : null}
          </div>
        )}
        <div className="w-full flex items-end gap-2">
        <button
          type="button"
          onClick={() => openImagePanel()}
          disabled={isStreaming}
          title="Generate image"
          aria-label="Generate image"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border border-white/[0.08] bg-white/[0.04] text-white/40 transition-colors hover:border-[#e8507a]/40 hover:text-[#e8507a] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Camera size={18} />
        </button>
        <label htmlFor="chat-composer-input" className="sr-only">
          Message to {character.name}
        </label>
        <textarea
          id="chat-composer-input"
          ref={textareaRef}
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              sendMessage()
            }
          }}
          placeholder={`Say something to ${character.name.split(' ')[0]}...`}
          className="flex-1 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] rounded-[20px] px-4 py-2.5 text-white font-body text-base md:text-[14px] focus:border-[#e8507a]/30 focus:outline-none resize-none min-h-[40px] max-h-[160px] transition-all placeholder:text-white/20 scrollbar-hide"
        />

        {isStreaming ? (
          <button
            type="button"
            onClick={cancelStream}
            aria-label="Stop generating"
            className={`${iconTouchClass} shrink-0 rounded-full bg-[#e8507a] hover:bg-rose-600 border border-white/10 active:scale-95`}
          >
            <X size={18} className="text-white mx-auto" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => sendMessage()}
            disabled={!input.trim()}
            aria-label="Send message"
            className={`${iconTouchClass} shrink-0 rounded-full flex items-center justify-center transition-all ${
              input.trim()
                ? 'bg-[#e8507a] hover:bg-rose-600 active:scale-95 border border-white/10'
                : 'bg-[rgba(255,255,255,0.06)] cursor-not-allowed opacity-60'
            }`}
          >
            <ArrowUp size={18} className="text-white" />
          </button>
        )}
        </div>
      </div>
    </footer>
  )
}
