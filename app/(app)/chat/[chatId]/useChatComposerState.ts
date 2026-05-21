'use client'

import { useState } from 'react'

export function useChatComposerState() {
  const [input, setInput] = useState('')
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editInput, setEditInput] = useState('')

  return {
    input,
    setInput,
    editingMessageId,
    setEditingMessageId,
    editInput,
    setEditInput,
  }
}
