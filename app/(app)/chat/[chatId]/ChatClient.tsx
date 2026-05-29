'use client'

import { useEffect, useRef, useState } from 'react'
import PersonaSelectModal from '@/components/PersonaSelectModal'
import type { Persona } from '@/lib/persona-constants'
import type { ChatClientProps } from './chat-types'
import { ChatSessionProvider } from './ChatSessionContext'
import { useChatStream } from './useChatStream'
import ChatHeader from './ChatHeader'
import AffectionPanel from './AffectionPanel'
import ChatMessageList from './ChatMessageList'
import ChatComposer from './ChatComposer'
import { useChatViewportSync } from './useChatViewportSync'
import { ChatQuotaExceededModal } from '@/components/chat/ChatQuotaExceededModal'
import { ChatImagePanel } from '@/components/chat/ChatImagePanel'
import { ChatImageFullscreen } from '@/components/chat/ChatImageFullscreen'
import { stopKokoroSpeaking } from '@/lib/kokoro-tts'

export { renderMessageContent } from './message-ui'

export default function ChatClient({
  chatId,
  character,
  persona: initialPersona,
  initialMessages,
  initialHasMore = false,
  initialOlderCursor = null,
  initialTitle,
  userDisplayName,
  initialAffectionScore,
  initialRelationshipLevel,
}: ChatClientProps) {
  const defaultTitle = initialTitle || character.name
  const [chatTitle, setChatTitle] = useState(defaultTitle)
  const [persona, setPersona] = useState<Persona | null>(initialPersona)
  const [syncedTitleKey, setSyncedTitleKey] = useState(
    () => `${initialTitle ?? ''}|${character.name}`
  )
  const [syncedPersonaId, setSyncedPersonaId] = useState(initialPersona?.id ?? '')

  const titleKey = `${initialTitle ?? ''}|${character.name}`
  if (titleKey !== syncedTitleKey) {
    setSyncedTitleKey(titleKey)
    setChatTitle(defaultTitle)
  }
  const personaId = initialPersona?.id ?? ''
  if (personaId !== syncedPersonaId) {
    setSyncedPersonaId(personaId)
    setPersona(initialPersona)
  }
  const [showPersonaModal, setShowPersonaModal] = useState(false)
  const [showAffectionPanel, setShowAffectionPanel] = useState(false)
  const [activeSpeakingId, setActiveSpeakingId] = useState<string | null>(null)
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true
    return localStorage.getItem('heartimate-voice-enabled') !== 'false'
  })

  const stickBottomRef = useRef(true)
  const editTextareaRef = useRef<HTMLTextAreaElement>(null)

  useChatViewportSync()
  useEffect(() => {
    return () => stopKokoroSpeaking()
  }, [])

  const stream = useChatStream({
    chatId,
    character,
    initialMessages,
    initialHasMore,
    initialOlderCursor,
    initialAffectionScore,
    initialRelationshipLevel,
    stickBottomRef,
  })

  return (
    <ChatSessionProvider
      value={{
        chatId,
        character,
        stickBottomRef,
        editTextareaRef,
        ...stream,
        chatTitle,
        setChatTitle,
        persona,
        userDisplayName,
        activeSpeakingId,
        setActiveSpeakingId,
        voiceEnabled,
        setVoiceEnabled,
        showAffectionPanel,
        onToggleAffectionPanel: () => setShowAffectionPanel((v) => !v),
        onOpenPersonaModal: () => setShowPersonaModal(true),
      }}
    >
      <div
        id="chat-immersive-container"
        className="w-full h-[100dvh] bg-[#080608] text-white flex flex-col overflow-hidden font-body relative"
      >
        <ChatHeader />

        <AffectionPanel />

        <ChatMessageList />

        <ChatComposer />

        <ChatQuotaExceededModal
          open={stream.quotaModalOpen}
          resetIn={stream.quotaModalResetIn}
          onClose={() => stream.setQuotaModalOpen(false)}
        />

        <ChatImagePanel
          key={`${stream.showImagePanel}-${stream.prefilledImageRequest}`}
          isOpen={stream.showImagePanel}
          onClose={stream.closeImagePanel}
          onMessageSent={stream.handleImageMessageSent}
          character={character}
          chatId={chatId}
          characterId={character.id}
          relationshipLevel={stream.relationshipLevel}
          prefilledRequest={stream.prefilledImageRequest}
          onQuotaExceeded={(resetIn) => {
            stream.setQuotaModalResetIn(resetIn)
            stream.setQuotaModalOpen(true)
            stream.refreshQuota()
          }}
        />

        <ChatImageFullscreen
          imageUrl={stream.fullscreenImage}
          onClose={() => stream.setFullscreenImage(null)}
        />

        <PersonaSelectModal
          open={showPersonaModal}
          onClose={() => setShowPersonaModal(false)}
          characterId={character.id}
          characterName={character.name}
          mode="switch"
          chatId={chatId}
          currentPersonaId={persona?.id ?? null}
          onSwitched={(_personaId, updated) => {
            setPersona(updated)
            setShowPersonaModal(false)
          }}
        />
      </div>
    </ChatSessionProvider>
  )
}
