'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronLeft,
  MoreVertical,
  Plus,
  Trash2,
  User,
  Volume2,
  VolumeX,
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
import { resolveChatGreetingName } from '@/lib/chat-greeting-name'
import { DEFAULT_PERSONA_AVATAR } from './chat-types'
import { useChatSession } from './ChatSessionContext'
import { stopKokoroSpeaking } from '@/lib/kokoro-tts'

export default function ChatHeader() {
  const {
    chatId,
    character,
    chatTitle,
    setChatTitle,
    persona,
    userDisplayName,
    activeSpeakingId,
    setActiveSpeakingId,
    voiceEnabled,
    setVoiceEnabled,
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
  const playerName = resolveChatGreetingName({
    userDisplayName,
    personaName: persona?.name,
  })

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
      <header className="min-h-[4.75rem] sm:min-h-[5rem] md:min-h-[4.5rem] bg-[rgba(8,6,8,0.92)] backdrop-blur-[20px] border-b border-[rgba(255,255,255,0.06)] px-3 sm:px-4 md:px-5 py-3 flex-shrink-0 z-20 safe-top">
        <div className="flex items-start gap-3 w-full">
          <button
            type="button"
            onClick={() => router.push('/home')}
            aria-label="Back to home"
            className={`${iconTouchClass} -ml-1 mt-0.5 text-[rgba(255,255,255,0.5)] hover:text-white transition-colors flex-shrink-0`}
          >
            <ChevronLeft size={22} />
          </button>

          <div className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-full overflow-hidden border border-[#e8507a]/30 bg-gradient-to-br from-[#1a0a20] to-[#2d1040] flex-shrink-0">
            {character.avatar_url ? (
              <AvatarImage src={character.avatar_url} className="object-cover object-[center_top]" alt="" fill sizes="48px" />
            ) : (
              <span className="text-[#e8507a] font-heading italic text-sm flex items-center justify-center h-full">AI</span>
            )}
          </div>

          <div className="min-w-0 flex-1 pt-0.5">
            <h1 className="font-semibold text-[15px] sm:text-[16px] leading-snug text-white truncate pr-1">
              {chatTitle}
            </h1>
            <div className="flex items-center gap-2.5 mt-2 min-w-0">
              <span
                className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse flex-shrink-0"
                title="Online"
                aria-hidden
              />
              <button
                type="button"
                onClick={onToggleAffectionPanel}
                aria-pressed={showAffectionPanel}
                aria-label={`Relationship: ${relInfo.label}. Tap for details.`}
                className="rounded-full px-2.5 py-1 text-[10px] font-label uppercase tracking-[0.12em] shrink-0"
                style={{ background: `${relInfo.color}18`, color: relInfo.color }}
              >
                {relInfo.label}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0 pt-0.5">
            <button
              type="button"
              onClick={() => {
                const newVal = !voiceEnabled
                setVoiceEnabled(newVal)
                localStorage.setItem('heartimate-voice-enabled', String(newVal))
                if (!newVal) {
                  stopKokoroSpeaking()
                  setActiveSpeakingId(null)
                }
              }}
              aria-label={voiceEnabled ? 'Disable voice' : 'Enable voice'}
              title={voiceEnabled ? 'Disable voice' : 'Enable voice'}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: voiceEnabled ? 'white' : 'rgba(255,255,255,0.3)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {voiceEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>
            <button
              type="button"
              onClick={onOpenPersonaModal}
              aria-label={`Switch persona. Current: ${playerName}`}
              className="hidden lg:flex items-center gap-2.5 min-w-0 group cursor-pointer rounded-xl hover:bg-white/5 px-2 py-1 transition-colors min-h-[44px]"
              title="Switch persona"
            >
              <div className="relative w-10 h-10 rounded-full overflow-hidden border border-white/20 flex-shrink-0 group-hover:border-[#e8507a]/50 transition-colors">
                {persona?.avatar_url ? (
                  <AvatarImage src={persona.avatar_url} className="object-cover" alt="" fill sizes="40px" />
                ) : (
                  <AvatarImage src={DEFAULT_PERSONA_AVATAR} className="object-cover opacity-70" alt="" fill sizes="40px" />
                )}
              </div>
              <span className="text-[14px] text-white/85 truncate max-w-[120px] group-hover:text-white">
                {playerName}
              </span>
            </button>

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
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-52 bg-[#120d14] border border-[rgba(255,255,255,0.1)] rounded-[12px] p-1.5 shadow-2xl z-30 animate-in fade-in slide-in-from-top-2 duration-200"
                >
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
          </div>
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
