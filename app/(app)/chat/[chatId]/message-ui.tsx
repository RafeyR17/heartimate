'use client'

import React, { useState } from 'react'
import { cn } from '@/lib/utils'

export function formatMessage(content: string) {
  if (!content) return ''
  const parts = content.split(/(\*.*?\*)/g)
  return parts.map((part, index) => {
    if (part.startsWith('*') && part.endsWith('*')) {
      return (
        <span
          key={index}
          className="italic text-[#e8507a] font-heading font-medium tracking-wide text-[13.5px] leading-relaxed block my-1"
        >
          {part.slice(1, -1)}
        </span>
      )
    }
    return <span key={index}>{part}</span>
  })
}

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
