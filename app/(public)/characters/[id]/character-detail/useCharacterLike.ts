'use client'

import { useState } from 'react'
import { apiFetch } from '@/lib/api-client'
import { capturePostHog } from '@/lib/posthog-browser'
import type { CharacterDetailCharacter } from './types'

export function useCharacterLike(
  character: CharacterDetailCharacter,
  initialIsLiked: boolean,
  currentUserId: string | null
) {
  const [liked, setLiked] = useState(initialIsLiked)
  const [likeCount, setLikeCount] = useState(character.likes_count || 0)
  const [liking, setLiking] = useState(false)
  const [animateLike, setAnimateLike] = useState(false)

  async function toggleLike() {
    if (liking || !currentUserId) return
    setLiking(true)
    setAnimateLike(true)
    setTimeout(() => setAnimateLike(false), 450)

    const prevLiked = liked
    const prevCount = likeCount
    setLiked(!liked)
    setLikeCount(liked ? Math.max(0, likeCount - 1) : likeCount + 1)

    try {
      const result = await apiFetch<{
        liked?: boolean
        likesCount?: number
      }>(`/api/characters/${character.id}/like`, {
        method: 'POST',
      })
      if (!result.ok) throw new Error(result.error || 'Like failed')
      setLiked(result.data.liked === true)
      setLikeCount(
        typeof result.data.likesCount === 'number' ? result.data.likesCount : likeCount
      )
      if (result.data.liked) {
        void capturePostHog('character_liked', {
          character_id: character.id,
          character_name: character.name,
          character_tags: character.tags,
        })
      }
    } catch (err) {
      console.error('Error toggling like:', err)
      setLiked(prevLiked)
      setLikeCount(prevCount)
    } finally {
      setLiking(false)
    }
  }

  return { liked, likeCount, liking, animateLike, toggleLike }
}
