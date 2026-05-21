'use client'

import { MessageCircle } from 'lucide-react'
import type { CharacterDetailCharacter } from './types'
import { CHARACTER_DETAIL_ROSE } from './types'

interface CharacterDetailHeaderProps {
  character: CharacterDetailCharacter
  likeCount: number
  chatError: string | null
  onStartChat: () => void
}

export function CharacterDetailHeader({
  character,
  likeCount,
  chatError,
  onStartChat,
}: CharacterDetailHeaderProps) {
  return (
    <>
      <button
        type="button"
        onClick={onStartChat}
        className="hidden lg:flex group w-full items-center justify-center gap-3 rounded-2xl py-5 text-white font-heading italic text-2xl transition-all duration-300 cursor-pointer disabled:opacity-70 border border-white/10"
        style={{
          background: `linear-gradient(135deg, ${CHARACTER_DETAIL_ROSE} 0%, #c93d66 100%)`,
          boxShadow: '0 12px 40px rgba(232,80,122,0.35)',
        }}
      >
        <MessageCircle className="w-6 h-6 fill-white/90" />
        Start Chatting →
      </button>
      {chatError && (
        <p className="hidden lg:block text-sm text-red-400 mt-2 text-center">{chatError}</p>
      )}

      <div className="mt-5 grid grid-cols-3 rounded-2xl border border-white/8 bg-white/[0.02] divide-x divide-white/8 overflow-hidden">
        {[
          { label: 'Admirers', value: likeCount, key: 'likes' },
          { label: 'Encounters', value: character.chat_count || 0, key: 'chats' },
          { label: 'Traits', value: character.tags.length, key: 'traits' },
        ].map((stat) => (
          <div key={stat.key} className="py-5 text-center">
            <p className="font-heading text-3xl font-bold text-white tabular-nums transition-all duration-300">
              {stat.value}
            </p>
            <p className="font-label text-[9px] uppercase tracking-[0.2em] text-white/40 mt-1">
              {stat.label}
            </p>
          </div>
        ))}
      </div>
    </>
  )
}
