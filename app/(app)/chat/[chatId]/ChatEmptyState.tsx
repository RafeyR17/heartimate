'use client'

import { AvatarImage } from '@/components/ui/avatar-image'
import type { ChatCharacter } from './chat-types'
import { getConversationStarters } from '@/lib/chat-starters'

interface ChatEmptyStateProps {
  character: ChatCharacter
  isStreaming: boolean
  sendMessage: (text?: string) => void
}

export default function ChatEmptyState({ character, isStreaming, sendMessage }: ChatEmptyStateProps) {
  const starters = getConversationStarters(character.tags || [])

  return (
    <div className="flex-1 flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="relative w-[80px] h-[80px] rounded-full overflow-hidden border-2 border-[#e8507a]/50 mb-6 shadow-[0_0_28px_rgba(232,80,122,0.35)]">
        {character.avatar_url ? (
          <AvatarImage src={character.avatar_url} className="object-cover object-[center_top]" alt="" fill sizes="80px" />
        ) : (
          <span className="text-[#e8507a] font-heading italic text-sm flex items-center justify-center h-full">AI</span>
        )}
      </div>
      <h2 className="font-heading italic text-[28px] text-white mb-3">{character.name}</h2>
      <p className="text-[14px] text-white/45 max-w-[400px] mb-3">{character.description}</p>
      <p className="text-[13px] italic text-[#e8507a] mb-8">Say something to start your story...</p>
      <div className="flex flex-col sm:flex-row flex-wrap gap-2 justify-center">
        {starters.map((s) => (
          <button
            key={s}
            type="button"
            disabled={isStreaming}
            onClick={() => sendMessage(s)}
            className="px-5 py-2 rounded-[50px] border border-[#e8507a]/40 bg-white/[0.04] text-[13px] text-white/90 hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  )
}
