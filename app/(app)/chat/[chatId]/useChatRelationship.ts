'use client'

import { useCallback, useState } from 'react'
import { getRelationshipLevel } from '@/lib/affection'
import { streamRelationshipFromHeaders } from '@/lib/chat-stream-client'

export interface UseChatRelationshipOptions {
  initialAffectionScore: number
  initialRelationshipLevel: string
  characterName: string
}

export interface ChatRelationshipServerSnapshot {
  initialAffectionScore: number
  initialRelationshipLevel: string
}

export function useChatRelationship({
  initialAffectionScore,
  initialRelationshipLevel,
  characterName,
}: UseChatRelationshipOptions) {
  const [affectionScore, setAffectionScore] = useState(initialAffectionScore)
  const [relationshipLevel, setRelationshipLevel] = useState(initialRelationshipLevel)
  const [specialStream, setSpecialStream] = useState(false)
  const [justSpecialIds, setJustSpecialIds] = useState<Set<string>>(new Set())
  const [levelFlashColor, setLevelFlashColor] = useState<string | null>(null)
  const [levelToast, setLevelToast] = useState<string | null>(null)

  const applyServerSnapshot = useCallback((snapshot: ChatRelationshipServerSnapshot) => {
    setAffectionScore(snapshot.initialAffectionScore)
    setRelationshipLevel(snapshot.initialRelationshipLevel)
    setSpecialStream(false)
    setJustSpecialIds(new Set())
  }, [])

  const applyStreamHeaders = useCallback(
    (headers: Headers) => {
      const rel = streamRelationshipFromHeaders(
        headers,
        affectionScore,
        relationshipLevel
      )
      setSpecialStream(rel.specialReply)
      setAffectionScore(rel.affectionScore)
      setRelationshipLevel(rel.relationshipLevel)
      if (rel.levelUp) {
        setLevelFlashColor(rel.levelInfo.color)
        setTimeout(() => setLevelFlashColor(null), 820)
        setLevelToast(
          `Your bond with ${characterName} deepened. You are now ${rel.levelInfo.label}.`
        )
        setTimeout(() => setLevelToast(null), 4000)
      }
      return rel
    },
    [affectionScore, characterName, relationshipLevel]
  )

  const markAssistantSpecial = useCallback((messageId: string, isSpecial: boolean) => {
    if (!isSpecial) return
    setJustSpecialIds((prev) => new Set(prev).add(messageId))
  }, [])

  const clearSpecialStream = useCallback(() => {
    setSpecialStream(false)
  }, [])

  const relInfo = getRelationshipLevel(affectionScore)

  return {
    affectionScore,
    relationshipLevel,
    specialStream,
    justSpecialIds,
    levelFlashColor,
    levelToast,
    relInfo,
    applyStreamHeaders,
    applyServerSnapshot,
    markAssistantSpecial,
    clearSpecialStream,
  }
}
