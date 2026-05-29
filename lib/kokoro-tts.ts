'use client'

import {
  getStoredVoiceSpeed,
  loadSpeechVoices,
  pickDefaultSpeechVoice,
} from './speech-voices'

export function cleanTextForSpeech(text: string): string {
  return text
    .replace(/\*[^*]*\*/g, '')
    .replace(/\*\*/g, '')
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')
    .replace(/[#\[\]{}|\\^~`]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function speakWithKokoro(
  text: string,
  options?: {
    onStart?: () => void
    onEnd?: () => void
    onError?: (err: Error) => void
  }
): Promise<void> {
  return new Promise((resolve) => {
    const clean = cleanTextForSpeech(text)
    if (!clean || typeof window === 'undefined') {
      resolve()
      return
    }

    void (async () => {
      try {
        window.speechSynthesis.cancel()

        const voices = await loadSpeechVoices()
        const utterance = new SpeechSynthesisUtterance(clean)
        utterance.rate = getStoredVoiceSpeed()
        utterance.pitch = 1.0
        utterance.volume = 1.0

        const voice = pickDefaultSpeechVoice(voices)
        if (voice) utterance.voice = voice

        utterance.onstart = () => options?.onStart?.()
        utterance.onend = () => {
          options?.onEnd?.()
          resolve()
        }
        utterance.onerror = (e) => {
          options?.onError?.(new Error(e.error))
          resolve()
        }

        window.speechSynthesis.speak(utterance)
      } catch (err) {
        options?.onError?.(err instanceof Error ? err : new Error(String(err)))
        resolve()
      }
    })()
  })
}

export function stopKokoroSpeaking(): void {
  if (typeof window !== 'undefined') {
    window.speechSynthesis.cancel()
  }
}

export function isKokoroSpeaking(): boolean {
  if (typeof window === 'undefined') return false
  return window.speechSynthesis.speaking
}
