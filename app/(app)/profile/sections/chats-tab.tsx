'use client'

import Image from 'next/image'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { MessageSquare, Trash2 } from 'lucide-react'
import { EmptyState } from '@/components/EmptyState'
import type { ProfileChat } from '@/lib/profile-types'

export function ChatsTab({
  chats,
  count,
  removingIds,
  onDelete,
}: {
  chats: ProfileChat[]
  count: number
  removingIds: Set<string>
  onDelete: (chatId: string, e: React.MouseEvent) => void
}) {
  return (
    <div className="w-full">
      <div className="flex items-center gap-3 mb-6">
        <h2 className="font-body font-semibold text-[18px] text-white">My Chats</h2>
        <span className="font-label text-[11px] px-2 py-0.5 rounded-full bg-white/5 text-muted">
          {count}
        </span>
      </div>

      {chats.length === 0 ? (
        <EmptyState
          icon={<MessageSquare />}
          title="No conversations yet"
          subtitle="Start a chat with a character and pick up where you left off."
          action={{ label: 'Explore characters', href: '/explore' }}
        />
      ) : (
        <ul className="rounded-2xl border border-white/[0.06] overflow-hidden divide-y divide-white/[0.05]">
          {chats.map((chat) => {
            const preview = chat.lastMessage
            const charName = chat.character?.name || 'Character'
            let previewText = 'No messages yet'
            if (preview) {
              previewText =
                preview.role === 'user'
                  ? `You: ${preview.content}`
                  : `${charName}: ${preview.content}`
            }
            return (
              <li
                key={chat.id}
                className={`group transition-all duration-300 ${
                  removingIds.has(chat.id) ? 'opacity-0' : ''
                }`}
              >
                <Link
                  href={`/chat/${chat.id}`}
                  className="flex items-center gap-3.5 p-4 hover:bg-white/[0.03] transition-colors"
                >
                  <div className="relative w-14 h-14 rounded-full overflow-hidden border border-white/10 shrink-0">
                    <Image
                      src={chat.character?.avatar_url || '/images/characters/lyra.jpg'}
                      alt=""
                      fill
                      className="object-cover object-[center_top]"
                      sizes="56px"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-body font-semibold text-[15px] text-white">{charName}</p>
                    <p className="font-body text-[13px] text-muted truncate">{previewText}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {chat.last_message_at && (
                      <span className="font-body text-[11px] text-white/30">
                        {formatDistanceToNow(new Date(chat.last_message_at), { addSuffix: true })}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={(e) => onDelete(chat.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-muted hover:text-red-400 transition-opacity cursor-pointer"
                      aria-label="Delete chat"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
