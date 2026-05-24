'use client'

import { Download, X } from 'lucide-react'
import { PollinationsThumbnail } from '@/components/chat/PollinationsThumbnail'

type ChatImageFullscreenProps = {
  imageUrl: string | null
  onClose: () => void
}

export function ChatImageFullscreen({ imageUrl, onClose }: ChatImageFullscreenProps) {
  if (!imageUrl) return null

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black/95 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose()
      }}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
        aria-label="Close"
      >
        <X size={22} />
      </button>

      <div
        className="relative h-[min(85vh,90vw)] w-[min(90vw,85vh)] flex-1"
        onClick={(e) => e.stopPropagation()}
      >
        <PollinationsThumbnail url={imageUrl} alt="Full size" className="rounded-xl" />
      </div>

      <a
        href={imageUrl}
        download="heartimate-image.jpg"
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#e8507a] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#e8507a]/90"
      >
        <Download size={16} />
        Download
      </a>
    </div>
  )
}
