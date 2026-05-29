'use client'

import { useState } from 'react'
import { Loader2, Volume2, VolumeX } from 'lucide-react'
import { speakWithKokoro, stopKokoroSpeaking } from '@/lib/kokoro-tts'

interface VoiceButtonProps {
  text: string
  messageId: string
  activeSpeakingId: string | null
  onSpeakingChange: (id: string | null) => void
}

export function VoiceButton({
  text,
  messageId,
  activeSpeakingId,
  onSpeakingChange,
}: VoiceButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  const isThisSpeaking = activeSpeakingId === messageId

  async function handleClick() {
    if (isThisSpeaking) {
      stopKokoroSpeaking()
      onSpeakingChange(null)
      return
    }

    stopKokoroSpeaking()
    onSpeakingChange(null)
    setLoading(true)
    setError(false)

    await speakWithKokoro(text, {
      onStart: () => {
        setLoading(false)
        onSpeakingChange(messageId)
      },
      onEnd: () => {
        onSpeakingChange(null)
      },
      onError: () => {
        setLoading(false)
        setError(true)
        onSpeakingChange(null)
        setTimeout(() => setError(false), 3000)
      },
    })
  }

  return (
    <button
      onClick={handleClick}
      title={loading ? 'Loading voice...' : isThisSpeaking ? 'Stop' : 'Listen'}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        padding: '4px 8px',
        borderRadius: '6px',
        background: isThisSpeaking ? 'rgba(232,80,122,0.12)' : 'transparent',
        border: isThisSpeaking
          ? '1px solid rgba(232,80,122,0.3)'
          : '1px solid transparent',
        color: isThisSpeaking
          ? '#e8507a'
          : error
            ? '#ef4444'
            : 'rgba(255,255,255,0.4)',
        cursor: 'pointer',
        transition: 'all 0.15s',
      }}
    >
      {loading ? (
        <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
      ) : isThisSpeaking ? (
        <VolumeX size={13} />
      ) : (
        <Volume2 size={13} />
      )}
      <span style={{ fontSize: '11px', fontFamily: 'var(--font-body)' }}>
        {loading ? 'Loading...' : isThisSpeaking ? 'Stop' : 'Listen'}
      </span>
    </button>
  )
}
