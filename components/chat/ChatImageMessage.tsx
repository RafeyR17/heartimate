'use client'

import { Download, Maximize2 } from 'lucide-react'
import { PollinationsThumbnail } from '@/components/chat/PollinationsThumbnail'
import { AvatarImage } from '@/components/ui/avatar-image'
import { TimestampHover, renderMessageContent } from '@/app/(app)/chat/[chatId]/message-ui'
import { formatMessageTooltip } from '@/lib/chat-starters'
import type { ChatCharacter, Message } from '@/lib/chat-ui-types'
import type { TouchHandlers } from '@/app/(app)/chat/[chatId]/message-ui'

type ChatImageMessageProps = {
  msg: Message
  character: ChatCharacter
  touchHandlers: TouchHandlers
  onOpenFullscreen: (url: string) => void
}

export function isImageMessage(msg: Message): boolean {
  return msg.message_type === 'image' && Boolean(msg.image_url?.trim())
}

export function ChatImageMessage({
  msg,
  character,
  touchHandlers,
  onOpenFullscreen,
}: ChatImageMessageProps) {
  const url = msg.image_url!

  return (
    <div className="flex gap-2 md:gap-3 group/msg w-full min-w-0">
      <div className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#e8507a]/20 bg-gradient-to-br from-[#1a0a20] to-[#2d1040]">
        {character.avatar_url ? (
          <AvatarImage
            src={character.avatar_url}
            className="object-cover object-[center_top]"
            alt={character.name}
            fill
            sizes="32px"
          />
        ) : (
          <span className="font-heading text-[10px] italic text-[#e8507a]">AI</span>
        )}
      </div>

      <div className="min-w-0 max-w-[min(100%,280px)]">
        <TimestampHover label={formatMessageTooltip(msg.created_at)}>
          <button
            type="button"
            tabIndex={0}
            onClick={() => onOpenFullscreen(url)}
            className="group/img relative block w-[220px] max-w-full overflow-hidden rounded-[4px_16px_16px_16px] border border-white/[0.07] text-left outline-none ring-[#e8507a]/30 focus-visible:ring-2"
            {...touchHandlers}
          >
            <div className="relative aspect-square w-full min-h-[220px]">
              <PollinationsThumbnail url={url} alt="Character image" />
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover/img:bg-black/30">
                <Maximize2
                  className="text-white opacity-0 transition-opacity group-hover/img:opacity-90"
                  size={24}
                />
              </div>
            </div>
          </button>
        </TimestampHover>

        <div className="mt-1.5">{renderMessageContent(msg.content)}</div>

        <a
          href={url}
          download="heartimate-image.jpg"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-flex items-center gap-1 text-[11px] text-[#e8507a]/70 hover:text-[#e8507a]"
        >
          <Download size={10} />
          Save image
        </a>
      </div>
    </div>
  )
}
