'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronLeft,
  MoreVertical,
  Plus,
  Trash2,
  User,
} from 'lucide-react'
import {
  apiFetch,
  apiField,
  applyApiFetchFailure,
} from '@/lib/api-client'
import { AvatarImage } from '@/components/ui/avatar-image'
import { useToast } from '@/components/ToastProvider'
import { AccessibleDialog } from '@/components/AccessibleDialog'
import { iconTouchClass } from '@/lib/touch-targets'
import { DEFAULT_PERSONA_AVATAR } from './chat-types'
import { useChatSession } from './ChatSessionContext'

export default function ChatHeader() {
  const {
    chatId,
    character,
    chatTitle,
    setChatTitle,
    persona,
    userDisplayName,
    relInfo,
    showAffectionPanel,
    onToggleAffectionPanel,
    onOpenPersonaModal,
    clearMessages: onClearChat,
  } = useChatSession()
  const router = useRouter()
  const { error: toastError, warning: toastWarning } = useToast()

  const [showDropdown, setShowDropdown] = useState(false)
  const [showRenameModal, setShowRenameModal] = useState(false)
  const [renameDraft, setRenameDraft] = useState(chatTitle)
  const [confirmClearOpen, setConfirmClearOpen] = useState(false)
  const [confirmDeleteChatOpen, setConfirmDeleteChatOpen] = useState(false)

  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const loginRedirectPath = `/chat/${chatId}`

  async function handleRenameSave() {
    const t = renameDraft.trim()
    if (!t) return
    const result = await apiFetch(`/api/chats/${chatId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: t }),
    })
    if (!result.ok) {
      applyApiFetchFailure(result, {
        toastError,
        toastWarning,
        loginRedirectPath,
        toastTitle: 'Could not rename chat',
      })
      return
    }
    setChatTitle(apiField<string>(result.data, 'title') || t)
    setShowRenameModal(false)
  }

  async function handleClearChatConfirm() {
    setConfirmClearOpen(false)
    setShowDropdown(false)
    const result = await apiFetch(`/api/chats/${chatId}/messages`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emptyOnly: true }),
    })
    if (!result.ok) {
      applyApiFetchFailure(result, {
        toastError,
        toastWarning,
        loginRedirectPath,
        toastTitle: 'Could not clear chat',
      })
      return
    }
    await onClearChat()
  }

  async function handleDeleteChatConfirm() {
    setConfirmDeleteChatOpen(false)
    setShowDropdown(false)
    const result = await apiFetch(`/api/chats/${chatId}`, { method: 'DELETE' })
    if (!result.ok) {
      applyApiFetchFailure(result, {
        toastError,
        toastWarning,
        loginRedirectPath,
        toastTitle: 'Could not delete chat',
      })
      return
    }
    router.push('/home')
  }

  async function handleNewChat() {
    setShowDropdown(false)
    const result = await apiFetch<{ chatId?: string }>('/api/chats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        characterId: character.id,
        personaId: persona?.id ?? null,
        skipDefaultPersona: !persona,
      }),
    })
    if (!result.ok) {
      applyApiFetchFailure(result, {
        toastError,
        toastWarning,
        loginRedirectPath,
        toastTitle: 'Could not start new chat',
      })
      return
    }
    const newChatId = apiField<string>(result.data, 'chatId')
    if (newChatId) {
      router.push(`/chat/${newChatId}`)
    } else {
      toastError('Could not start new chat', 'Missing chat id in response.')
    }
  }

  return (
    <>
      <header className="h-14 md:min-h-[60px] bg-[rgba(8,6,8,0.9)] backdrop-blur-[20px] border-b border-[rgba(255,255,255,0.06)] px-3 md:px-4 py-2 flex-shrink-0 flex items-center justify-between z-20 gap-2 safe-top">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button
            type="button"
            onClick={() => router.push('/home')}
            aria-label="Back to home"
            className={`${iconTouchClass} text-[rgba(255,255,255,0.5)] hover:text-white transition-colors flex-shrink-0 -ml-2`}
          >
            <ChevronLeft size={24} />
          </button>

          <div className="flex items-center gap-2 min-w-0">
            <div className="relative w-[36px] h-[36px] rounded-full overflow-hidden border border-[#e8507a]/30 bg-gradient-to-br from-[#1a0a20] to-[#2d1040] flex-shrink-0">
              {character.avatar_url ? (
                <AvatarImage src={character.avatar_url} className="object-cover object-[center_top]" alt="" fill sizes="36px" />
              ) : (
                <span className="text-[#e8507a] font-heading italic text-xs flex items-center justify-center h-full">AI</span>
              )}
            </div>
            <div className="min-w-0">
              <span className="font-semibold text-[14px] leading-tight text-white truncate block">{chatTitle}</span>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="w-[5px] h-[5px] rounded-full bg-[#22c55e] animate-pulse flex-shrink-0" />
                <span className="text-[10px] text-[rgba(255,255,255,0.4)]">Online</span>
              </div>
              <button
                type="button"
                onClick={onToggleAffectionPanel}
                aria-pressed={showAffectionPanel}
                className="mt-1 inline-flex items-center gap-1 rounded-full px-3 min-h-[44px] text-[10px] uppercase tracking-[0.1em]"
                style={{ background: `${relInfo.color}20`, color: relInfo.color }}
              >
                ● {relInfo.label}
              </button>
            </div>
          </div>

          <span className="text-white/20 text-lg flex-shrink-0 hidden sm:inline px-1">×</span>

          <button
            type="button"
            onClick={onOpenPersonaModal}
            aria-label={`Switch persona. Current: ${persona?.name || userDisplayName}`}
            className="flex items-center gap-2 min-w-0 group cursor-pointer rounded-lg hover:bg-white/5 px-1 py-0.5 transition-colors min-h-[44px]"
            title="Switch persona"
          >
            <div className="relative w-[32px] h-[32px] rounded-full overflow-hidden border border-white/20 flex-shrink-0 group-hover:border-[#e8507a]/50 transition-colors">
              {persona?.avatar_url ? (
                <AvatarImage src={persona.avatar_url} className="object-cover" alt="" fill sizes="32px" />
              ) : (
                <AvatarImage src={DEFAULT_PERSONA_AVATAR} className="object-cover opacity-70" alt="" fill sizes="32px" />
              )}
            </div>
            <div className="min-w-0 hidden sm:block text-left">
              <span className="text-[10px] text-[#e8507a] font-label uppercase tracking-wider block">You</span>
              <span className="text-[13px] text-white/80 truncate block group-hover:text-white">
                {persona?.name || userDisplayName}
              </span>
            </div>
          </button>
        </div>

        <div ref={dropdownRef} className="relative">
          <button
            type="button"
            onClick={() => setShowDropdown(!showDropdown)}
            aria-label="Chat menu"
            aria-expanded={showDropdown}
            aria-haspopup="menu"
            className={`${iconTouchClass} text-white/50 hover:text-white rounded-full hover:bg-white/5 transition-all`}
          >
            <MoreVertical size={20} />
          </button>

          {showDropdown && (
            <div className="absolute right-0 mt-2 w-52 bg-[#120d14] border border-[rgba(255,255,255,0.1)] rounded-[12px] p-1.5 shadow-2xl z-30 animate-in fade-in slide-in-from-top-2 duration-200">
              <button
                type="button"
                onClick={() => {
                  setRenameDraft(chatTitle)
                  setShowRenameModal(true)
                  setShowDropdown(false)
                }}
                className="w-full text-left px-3 min-h-[44px] flex items-center text-[13px] hover:bg-white/5 rounded-lg text-white/80"
              >
                Rename chat
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDropdown(false)
                  onOpenPersonaModal()
                }}
                className="w-full text-left px-3 min-h-[44px] flex items-center gap-2 text-[13px] hover:bg-white/5 rounded-lg text-white/80"
              >
                <User size={16} className="text-white/40" />
                Switch persona
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDropdown(false)
                  router.push(`/characters/${character.id}`)
                }}
                className="w-full text-left px-3 min-h-[44px] flex items-center gap-2 text-[13px] hover:bg-white/5 rounded-lg text-white/80"
              >
                <User size={16} className="text-white/40" />
                View character
              </button>
              <button
                type="button"
                onClick={handleNewChat}
                className="w-full text-left px-3 min-h-[44px] flex items-center gap-2 text-[13px] hover:bg-white/5 rounded-lg text-white/80"
              >
                <Plus size={16} className="text-white/40" />
                New chat
              </button>
              <div className="h-[1px] bg-white/5 my-1" />
              <button
                type="button"
                onClick={() => {
                  setShowDropdown(false)
                  setConfirmClearOpen(true)
                }}
                className="w-full text-left px-3 min-h-[44px] flex items-center gap-2 text-[13px] hover:bg-[#ff4444]/10 rounded-lg text-[#ff4444]"
              >
                <Trash2 size={16} />
                Clear chat
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDropdown(false)
                  setConfirmDeleteChatOpen(true)
                }}
                className="w-full text-left px-3 min-h-[44px] flex items-center text-[13px] hover:bg-white/5 rounded-lg text-red-400"
              >
                Delete chat
              </button>
            </div>
          )}
        </div>
      </header>

      <AccessibleDialog
        open={showRenameModal}
        onClose={() => setShowRenameModal(false)}
        title="Rename chat"
        visibleTitle
      >
        <label htmlFor="rename-chat-input" className="sr-only">
          Chat title
        </label>
        <input
          id="rename-chat-input"
          value={renameDraft}
          onChange={(e) => setRenameDraft(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-[14px] mb-3 min-h-[44px]"
        />
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            className="min-h-[44px] px-4 text-[13px] text-white/50"
            onClick={() => setShowRenameModal(false)}
          >
            Cancel
          </button>
          <button
            type="button"
            className="min-h-[44px] px-4 text-[13px] text-[#e8507a] font-medium"
            onClick={handleRenameSave}
          >
            Save
          </button>
        </div>
      </AccessibleDialog>

      <AccessibleDialog
        open={confirmClearOpen}
        onClose={() => setConfirmClearOpen(false)}
        title="Clear chat"
        visibleTitle
      >
        <p className="text-[14px] text-white/70 mb-4">Clear all messages? This cannot be undone.</p>
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            className="min-h-[44px] px-4 text-[13px] text-white/50"
            onClick={() => setConfirmClearOpen(false)}
          >
            Cancel
          </button>
          <button
            type="button"
            className="min-h-[44px] px-4 text-[13px] text-[#e8507a] font-medium"
            onClick={handleClearChatConfirm}
          >
            Clear
          </button>
        </div>
      </AccessibleDialog>

      <AccessibleDialog
        open={confirmDeleteChatOpen}
        onClose={() => setConfirmDeleteChatOpen(false)}
        title="Delete chat"
        visibleTitle
      >
        <p className="text-[14px] text-white/70 mb-4">Delete this chat forever?</p>
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            className="min-h-[44px] px-4 text-[13px] text-white/50"
            onClick={() => setConfirmDeleteChatOpen(false)}
          >
            Cancel
          </button>
          <button
            type="button"
            className="min-h-[44px] px-4 text-[13px] text-red-400 font-medium"
            onClick={handleDeleteChatConfirm}
          >
            Delete
          </button>
        </div>
      </AccessibleDialog>
    </>
  )
}
