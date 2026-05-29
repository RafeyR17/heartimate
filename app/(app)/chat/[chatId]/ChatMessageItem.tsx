'use client'

import { Check, Copy, Pencil, RefreshCw, Trash2 } from 'lucide-react'
import { formatMessageTooltip } from '@/lib/chat-starters'
import { cn } from '@/lib/utils'
import { AvatarImage } from '@/components/ui/avatar-image'
import { iconTouchClass } from '@/lib/touch-targets'
import { REACTION_KEYS, type Message, isUserRole } from './chat-types'
import { useChatSession } from './ChatSessionContext'
import { renderMessageContent, TimestampHover, type TouchHandlers } from './message-ui'
import { ChatImageMessage, isImageMessage } from '@/components/chat/ChatImageMessage'
import { VoiceButton } from '@/components/VoiceButton'

export interface ChatMessageItemProps {
  msg: Message
  index: number
  touchHandlers: TouchHandlers
}

export default function ChatMessageItem({ msg, index, touchHandlers }: ChatMessageItemProps) {
  const {
    character,
    isStreaming,
    lastAssistantIndex,
    exitingIds,
    editingMessageId,
    setEditingMessageId,
    editInput,
    setEditInput,
    editTextareaRef,
    copiedMessageId,
    pendingDeleteId,
    setPendingDeleteId,
    justSpecialIds,
    regenerateCount,
    myReaction,
    activeSpeakingId,
    setActiveSpeakingId,
    voiceEnabled,
    saveEdit,
    handleCopyMessage,
    deleteMessageConfirmed,
    toggleReaction,
    regenerate,
    setFullscreenImage,
  } = useChatSession()

  const isUser = isUserRole(msg.role)
  const isExiting = exitingIds.has(msg.id)

  if (!isUser && isImageMessage(msg)) {
    return (
      <div
        className={cn(
          'msg-wrap transition-all duration-300 ease-out flex w-full min-w-0 justify-start',
          isExiting ? 'overflow-hidden max-h-0 opacity-0 my-0 py-0' : 'max-h-[2000px] opacity-100'
        )}
      >
        <ChatImageMessage
          msg={msg}
          character={character}
          touchHandlers={touchHandlers}
          onOpenFullscreen={setFullscreenImage}
        />
      </div>
    )
  }
  const isLastAssistant = !isUser && index === lastAssistantIndex
  const showRegen = isLastAssistant && !isStreaming

  return (
    <div
      className={cn(
        'msg-wrap transition-all duration-300 ease-out flex w-full min-w-0',
        isExiting ? 'overflow-hidden max-h-0 opacity-0 my-0 py-0' : 'max-h-[2000px] opacity-100',
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      <div
        className={cn(
          'min-w-0',
          isUser
            ? 'max-w-[min(100%,92%)] sm:max-w-[80%] md:max-w-[65%]'
            : 'w-full max-w-full sm:max-w-[92%] md:max-w-[75%]'
        )}
      >
        {isUser ? (
          <div className="flex flex-col gap-1 items-end">
            {editingMessageId === msg.id ? (
              <div className="bg-[rgba(232,80,122,0.15)] border border-[#e8507a]/40 rounded-[16px] p-3 min-w-[240px] w-full transition-opacity duration-150">
                <textarea
                  ref={editTextareaRef}
                  value={editInput}
                  onChange={(e) => setEditInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setEditingMessageId(null)
                    if (e.key === 'Enter' && e.ctrlKey) {
                      e.preventDefault()
                      saveEdit(msg.id)
                    }
                  }}
                  className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-[14px] text-white focus:outline-none focus:border-[#e8507a]/60 resize-y min-h-[70px]"
                />
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => saveEdit(msg.id)}
                    className="px-4 py-1.5 rounded-full bg-[#e8507a] text-white text-[12px] font-medium"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingMessageId(null)}
                    className="px-4 py-1.5 rounded-full border border-white/15 text-white/70 text-[12px] hover:text-white"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="relative w-full flex flex-col items-end">
                <TimestampHover label={formatMessageTooltip(msg.created_at)} className="group/msg inline-block max-w-full min-w-0">
                  <div
                    tabIndex={0}
                    className="relative rounded-[16px_4px_16px_16px] bg-[rgba(232,80,122,0.22)] border border-[rgba(232,80,122,0.38)] px-4 py-3 pr-11 font-body text-[14px] text-white leading-relaxed outline-none ring-[#e8507a]/35 focus-visible:ring-2 select-text"
                    {...touchHandlers}
                  >
                    {renderMessageContent(msg.content)}
                    {!isStreaming && (
                      <div className="absolute top-1.5 right-1.5 z-10 flex items-center gap-0.5 rounded-md bg-black/30 p-0.5 opacity-0 transition-opacity duration-150 group-hover/msg:opacity-100 group-focus-within/msg:opacity-100">
                        <button
                          type="button"
                          onClick={() => handleCopyMessage(msg.id, msg.content)}
                          aria-label={copiedMessageId === msg.id ? 'Copied' : 'Copy message'}
                          className={`${iconTouchClass} rounded hover:bg-white/15 text-white/80 hover:text-white`}
                        >
                          {copiedMessageId === msg.id ? (
                            <Check size={14} className="text-green-400" />
                          ) : (
                            <Copy size={14} />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingMessageId(msg.id)
                            setEditInput(msg.content)
                          }}
                          aria-label="Edit message"
                          className={`${iconTouchClass} rounded hover:bg-white/15 text-white/80 hover:text-white`}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setPendingDeleteId(pendingDeleteId === msg.id ? null : msg.id)}
                          aria-label="Delete message"
                          className={`${iconTouchClass} rounded hover:bg-white/15 text-white/80 hover:text-white`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </TimestampHover>
                {pendingDeleteId === msg.id && (
                  <div className="mt-1 text-[11px] text-white/55 flex items-center gap-2">
                    <span>Delete this message?</span>
                    <button type="button" className="text-[#e8507a]" onClick={() => deleteMessageConfirmed(msg.id)}>
                      Yes
                    </button>
                    <button type="button" className="text-white/40" onClick={() => setPendingDeleteId(null)}>
                      No
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="flex gap-2 md:gap-3 group/msg w-full min-w-0">
            <div className="relative w-7 h-7 md:w-8 md:h-8 rounded-full overflow-hidden border border-[#e8507a]/20 bg-gradient-to-br from-[#1a0a20] to-[#2d1040] flex-shrink-0 flex items-center justify-center">
              {character.avatar_url ? (
                <AvatarImage
                  src={character.avatar_url}
                  className="object-cover object-[center_top]"
                  alt={character.name}
                  fill
                  sizes="32px"
                />
              ) : (
                <span className="text-[#e8507a] font-heading italic text-[10px]">AI</span>
              )}
            </div>
            <div className="flex flex-col gap-1 min-w-0 flex-1">
              <TimestampHover label={formatMessageTooltip(msg.created_at)}>
                <div
                  tabIndex={0}
                  className={`relative w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.07)] rounded-[4px_16px_16px_16px] p-[14px_16px] pr-10 font-body text-[rgba(255,255,255,0.9)] leading-[1.75] shadow-md select-text outline-none ring-[#e8507a]/30 focus-visible:ring-2 ${
                    justSpecialIds.has(msg.id) ? 'special-bubble' : ''
                  }`}
                  style={{
                    ...(activeSpeakingId === msg.id && {
                      borderColor: 'rgba(232,80,122,0.4)',
                      boxShadow: '0 0 20px rgba(232,80,122,0.1)',
                      animation: 'voicePulse 2s ease infinite',
                    }),
                  }}
                  {...touchHandlers}
                >
                  {renderMessageContent(msg.content)}
                  {justSpecialIds.has(msg.id) && (
                    <span title="A special moment" className="absolute bottom-1.5 right-2 text-[#e8507a] text-[12px]">
                      ✨
                    </span>
                  )}
                  {!isStreaming && (
                    <div className="absolute top-1.5 right-1.5 z-10 flex items-center gap-0.5 rounded-md bg-black/30 p-0.5 opacity-0 transition-opacity duration-150 group-hover/msg:opacity-100 group-focus-within/msg:opacity-100">
                      <button
                        type="button"
                        onClick={() => handleCopyMessage(msg.id, msg.content)}
                        aria-label={copiedMessageId === msg.id ? 'Copied' : 'Copy message'}
                        className={`${iconTouchClass} rounded hover:bg-white/15 text-white/85`}
                      >
                        {copiedMessageId === msg.id ? (
                          <Check size={14} className="text-green-400" />
                        ) : (
                          <Copy size={14} />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingDeleteId(pendingDeleteId === msg.id ? null : msg.id)}
                        aria-label="Delete message"
                        className={`${iconTouchClass} rounded hover:bg-white/10 text-white/60`}
                      >
                        <Trash2 size={14} />
                      </button>
                      {showRegen && (
                        <button
                          type="button"
                          onClick={() => regenerate()}
                          aria-label="Regenerate response"
                          className={`${iconTouchClass} rounded hover:bg-white/10 text-[#e8507a]`}
                        >
                          <RefreshCw size={14} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </TimestampHover>

              {pendingDeleteId === msg.id && (
                <div className="ml-1 text-[11px] text-white/55 flex items-center gap-2">
                  <span>Delete this message?</span>
                  <button type="button" className="text-[#e8507a]" onClick={() => deleteMessageConfirmed(msg.id)}>
                    Yes
                  </button>
                  <button type="button" className="text-white/40" onClick={() => setPendingDeleteId(null)}>
                    No
                  </button>
                </div>
              )}
              {voiceEnabled && !isStreaming && msg.role === 'assistant' && (
                <VoiceButton
                  text={msg.content}
                  messageId={msg.id}
                  activeSpeakingId={activeSpeakingId}
                  onSpeakingChange={setActiveSpeakingId}
                />
              )}

              <div className="relative pl-0 pt-1 opacity-0 group-hover/msg:opacity-100 translate-y-2 group-hover/msg:translate-y-0 transition-all duration-200">
                <div className="flex gap-1 items-center flex-wrap">
                  {REACTION_KEYS.map((em) => {
                    const active = myReaction[msg.id] === em
                    return (
                      <button
                        key={em}
                        type="button"
                        onClick={() => toggleReaction(msg.id, em)}
                        className={`min-h-[44px] min-w-[44px] md:min-h-[24px] md:min-w-[24px] px-1 rounded-md text-[13px] flex items-center justify-center gap-0.5 transition-colors ${
                          active ? 'bg-[#e8507a]/25 border border-[#e8507a]/40' : 'bg-white/5 border border-white/10'
                        }`}
                      >
                        <span>{em}</span>
                        {active && <span className="text-[10px] text-white/50">1</span>}
                      </button>
                    )
                  })}
                </div>
              </div>

              {showRegen && regenerateCount > 0 && (
                <p className="text-[10px] text-white/35 mt-0.5 font-label">↺ {regenerateCount}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
