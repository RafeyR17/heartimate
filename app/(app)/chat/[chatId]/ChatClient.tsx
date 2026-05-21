'use client'

import { useRef, useState } from 'react'
import PersonaSelectModal from '@/components/PersonaSelectModal'
import type { Persona } from '@/lib/personas'
import type { ChatClientProps } from './chat-types'
import { ChatSessionProvider } from './ChatSessionContext'
import { useChatStream } from './useChatStream'
import ChatHeader from './ChatHeader'
import AffectionPanel from './AffectionPanel'
import ChatMessageList from './ChatMessageList'
import ChatComposer from './ChatComposer'
import { useChatViewportSync } from './useChatViewportSync'

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

  const stickBottomRef = useRef(true)
  const editTextareaRef = useRef<HTMLTextAreaElement>(null)

  useChatViewportSync()

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
