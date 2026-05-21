'use client'

import { AvatarImage } from '@/components/ui/avatar-image'
import { getRelationshipLevel } from '@/lib/affection'
import { useChatSession } from './ChatSessionContext'

export default function AffectionPanel() {
  const {
    showAffectionPanel: open,
    character,
    affectionScore,
    levelFlashColor,
    levelToast,
  } = useChatSession()
  const relInfo = getRelationshipLevel(affectionScore)

  return (
    <>
      {open && (
        <div className="bg-[rgba(8,6,8,0.95)] backdrop-blur px-5 py-4 border-b border-white/10">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative w-9 h-9 rounded-full overflow-hidden border border-white/10">
                {character.avatar_url ? (
                  <AvatarImage
                    src={character.avatar_url}
                    alt={character.name}
                    fill
                    sizes="36px"
                    className="object-cover object-[center_top]"
                  />
                ) : (
                  <span className="text-[#e8507a] font-heading italic text-xs flex items-center justify-center h-full">
                    AI
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-white truncate">{character.name}</p>
                <p
                  className="text-[11px] uppercase tracking-wider font-label"
                  style={{ color: relInfo.color }}
                >
                  {relInfo.label}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p
                className="text-[22px] font-heading font-bold tabular-nums transition-colors duration-500"
                style={{ color: levelFlashColor ?? relInfo.color }}
              >
                {affectionScore}
              </p>
              <p className="text-[10px] text-white/40">Affection</p>
            </div>
          </div>
          {levelToast && (
            <p className="mt-2 text-[12px] text-[#e8507a] animate-in fade-in duration-300">{levelToast}</p>
          )}
        </div>
      )}
    </>
  )
}
