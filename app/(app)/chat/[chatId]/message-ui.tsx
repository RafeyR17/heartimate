'use client'

import React, { useState } from 'react'
import { cn } from '@/lib/utils'

/** @deprecated Wrapper styles live on `<p>` inside renderMessageContent. */
export const messageContentClassName = 'm-0'

/** Split *complete action sentences*; dialogue stays plain white text. */
export function renderMessageContent(content: string) {
  const cleaned = content
    .replace(/\*\s*"/g, '"')
    .replace(/"\s*\*/g, '"')
    .replace(/\*\s*'/g, "'")
    .replace(/'\s*\*/g, "'")
    // Remove asterisks when action is mid-sentence mixed with dialogue
    .replace(/"([^"]*)\*([^*"]+)\*([^"]*)"/g, '"$1$2$3"')

  const parts = cleaned.split(/(\*[^*\n]+\*)/g)

  return (
    <p
      style={{
        margin: 0,
        lineHeight: '1.8',
        fontSize: '15px',
        color: 'rgba(255,255,255,0.92)',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}
    >
      {parts.map((part, i) => {
        if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
          const inner = part.slice(1, -1)
          // Contains quotes or is short (single word/phrase) = white
          if (
            inner.includes('"') ||
            inner.includes("'") ||
            inner.split(' ').length < 4
          ) {
            return (
              <span key={i} style={{ color: 'rgba(255,255,255,0.92)' }}>
                {inner}
              </span>
            )
          }
          return (
            <em
              key={i}
              style={{
                color: 'rgba(232,80,122,0.85)',
                fontStyle: 'italic',
                fontFamily: 'Playfair Display, serif',
              }}
            >
              {inner}
            </em>
          )
        }
        return (
          <span key={i} style={{ color: 'rgba(255,255,255,0.92)' }}>
            {part}
          </span>
        )
      })}
    </p>
  )
}

/** @deprecated Use renderMessageContent */
export const formatMessage = renderMessageContent

export function TimestampHover({
  children,
  label,
  className,
}: {
  children: React.ReactNode
  label: string
  className?: string
}) {
  const [show, setShow] = useState(false)
  return (
    <div
      className={cn('relative', className)}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div
          className="absolute bottom-full left-0 mb-1 px-2 py-1 rounded-full text-[11px] font-label text-white/90 shadow-lg z-50 transition-opacity duration-150"
          style={{ background: 'rgba(0,0,0,0.8)' }}
        >
          {label}
        </div>
      )}
    </div>
  )
}

export function ChatMessageStyles() {
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
        @keyframes bounceStagger {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        .dot-1 { animation: bounceStagger 1.2s infinite ease-in-out; }
        .dot-2 { animation: bounceStagger 1.2s infinite ease-in-out 0.15s; }
        .dot-3 { animation: bounceStagger 1.2s infinite ease-in-out 0.3s; }
        @keyframes blinkEffect { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        .animate-blink { animation: blinkEffect 0.8s infinite; }
        .special-bubble { background-image: linear-gradient(110deg, rgba(232,80,122,0.10), rgba(255,255,255,0.03), rgba(232,80,122,0.10)); background-size: 220% 100%; animation: specialShimmer 1.8s linear infinite; }
        @keyframes specialShimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        @media (prefers-reduced-motion: reduce) {
          .dot-1, .dot-2, .dot-3, .animate-blink, .special-bubble {
            animation: none !important;
          }
        }
      `,
      }}
    />
  )
}

export type TouchHandlers = {
  onTouchStart: (e: React.TouchEvent) => void
  onTouchMove: (e: React.TouchEvent) => void
  onTouchEnd: () => void
}
