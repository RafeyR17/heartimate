'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { Share2, Heart, Loader2, GitFork, Flag } from 'lucide-react'
import { apiFetch, requireApiField } from '@/lib/api-client'
import type { ForkPayload } from '@/lib/character-fork'
import { setForkPayload } from '@/lib/client-storage'
import { capturePostHog } from '@/lib/posthog-browser'
import { REPORT_REASONS } from './CharacterReportModal'
import type { CharacterDetailCharacter } from './types'

const CharacterReportModal = dynamic(() => import('./CharacterReportModal'), {
  ssr: false,
})

interface CharacterDetailActionsProps {
  character: CharacterDetailCharacter
  currentUserId: string | null
  liked: boolean
  likeCount: number
  liking: boolean
  animateLike: boolean
  onToggleLike: () => void
  onToast: (message: string) => void
}

export function CharacterDetailActions({
  character,
  currentUserId,
  liked,
  likeCount,
  liking,
  animateLike,
  onToggleLike,
  onToast,
}: CharacterDetailActionsProps) {
  const [forking, setForking] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [reportReason, setReportReason] = useState<string>(REPORT_REASONS[0])
  const [reportDetails, setReportDetails] = useState('')
  const [reportSubmitting, setReportSubmitting] = useState(false)

  async function handleShare() {
    if (typeof window === 'undefined') return
    const url = `${window.location.origin}/characters/${character.id}`
    try {
      await navigator.clipboard.writeText(url)
      void capturePostHog('character_shared', {
        character_id: character.id,
        character_name: character.name,
      })
      onToast('Link copied!')
    } catch {
      onToast('Could not copy link')
    }
  }

  async function handleFork() {
    if (forking) return
    setForking(true)
    try {
      const result = await apiFetch(`/api/characters/${character.id}/fork`, {
        method: 'POST',
      })
      if (!result.ok) throw new Error(result.error || 'Fork failed')
      const fork = requireApiField<ForkPayload['fork']>(result.data, 'fork')
      const forkedFrom = requireApiField<ForkPayload['forkedFrom']>(result.data, 'forkedFrom')
      void capturePostHog('character_forked', {
        character_id: character.id,
        character_name: character.name,
        character_tags: character.tags,
      })
      setForkPayload({ fork, forkedFrom } satisfies ForkPayload)
      window.location.href = '/characters/create?fork=1'
    } catch (err) {
      console.error('Fork error:', err)
      onToast('Could not fork character')
      setForking(false)
    }
  }

  async function submitReport() {
    if (reportSubmitting) return
    if (reportReason === 'Other' && !reportDetails.trim()) {
      onToast('Please describe the issue')
      return
    }
    setReportSubmitting(true)
    try {
      const result = await apiFetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterId: character.id,
          reason: reportReason,
          details: reportDetails.trim() || undefined,
        }),
      })
      if (!result.ok) throw new Error(result.error || 'Report failed')
      setShowReportModal(false)
      setReportDetails('')
      setReportReason(REPORT_REASONS[0])
      onToast('Report submitted. Thank you.')
    } catch (err) {
      console.error('Report error:', err)
      onToast('Could not submit report')
    } finally {
      setReportSubmitting(false)
    }
  }

  return (
    <>
      {showReportModal && (
        <CharacterReportModal
          open={showReportModal}
          characterName={character.name}
          reportReason={reportReason}
          reportDetails={reportDetails}
          reportSubmitting={reportSubmitting}
          onClose={() => setShowReportModal(false)}
          onReasonChange={setReportReason}
          onDetailsChange={setReportDetails}
          onSubmit={submitReport}
        />
      )}

      <div className="mt-6 flex flex-wrap items-center gap-4 sm:gap-6 border-b border-white/8 pb-6">
        <button
          type="button"
          onClick={onToggleLike}
          disabled={liking || !currentUserId}
          aria-label={liked ? `Unlike (${likeCount} likes)` : `Like (${likeCount} likes)`}
          aria-pressed={liked}
          className="flex items-center gap-2.5 cursor-pointer group disabled:opacity-50 min-h-[44px]"
        >
          <span
            className={`inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-full transition-all ${animateLike ? 'scale-125' : ''}`}
            style={{
              background: liked ? 'rgba(232,80,122,0.15)' : 'transparent',
            }}
          >
            <Heart
              className={`w-5 h-5 transition-colors ${
                liked ? 'fill-rose text-rose' : 'text-white/40 group-hover:text-white'
              }`}
            />
          </span>
          <span className="text-sm font-medium text-white/90 tabular-nums">
            {liked ? 'Liked' : 'Like'} · {likeCount.toLocaleString()}
          </span>
        </button>

        <button
          type="button"
          onClick={handleShare}
          className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors cursor-pointer"
        >
          <Share2 className="w-4 h-4" />
          Share
        </button>

        <button
          type="button"
          onClick={handleFork}
          disabled={forking}
          className="flex items-center gap-2 text-sm text-white/50 hover:text-rose transition-colors cursor-pointer disabled:opacity-50"
        >
          {forking ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <GitFork className="w-4 h-4" />
          )}
          Fork Character
        </button>

        <button
          type="button"
          onClick={() => setShowReportModal(true)}
          className="flex items-center gap-2 text-sm text-white/50 hover:text-rose transition-colors cursor-pointer"
        >
          <Flag className="w-4 h-4" />
          Report
        </button>
      </div>
    </>
  )
}
