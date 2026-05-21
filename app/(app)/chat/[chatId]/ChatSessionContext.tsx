'use client'

import { createContext, useContext, type ReactNode, type RefObject } from 'react'
import type { Persona } from '@/lib/personas'
import type { ChatCharacter } from './chat-types'
import type { useChatStream } from './useChatStream'

/** Title, persona, and panel UI owned by ChatClient (not the stream hook). */
export type ChatChromeValue = {
  chatTitle: string
  setChatTitle: (title: string) => void
  persona: Persona | null
  userDisplayName: string
  showAffectionPanel: boolean
  onToggleAffectionPanel: () => void
  onOpenPersonaModal: () => void
}

export type ChatSessionValue = {
  chatId: string
  character: ChatCharacter
  stickBottomRef: React.MutableRefObject<boolean>
  editTextareaRef: RefObject<HTMLTextAreaElement | null>
} & ReturnType<typeof useChatStream> &
  ChatChromeValue

const ChatSessionContext = createContext<ChatSessionValue | null>(null)

export function ChatSessionProvider({
  value,
  children,
}: {
  value: ChatSessionValue
  children: ReactNode
}) {
  return (
    <ChatSessionContext.Provider value={value}>{children}</ChatSessionContext.Provider>
  )
}

export function useChatSession(): ChatSessionValue {
  const ctx = useContext(ChatSessionContext)
  if (!ctx) {
    throw new Error('useChatSession must be used within ChatSessionProvider')
  }
  return ctx
}
