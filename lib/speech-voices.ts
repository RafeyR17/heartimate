'use client'

export const VOICE_ID_STORAGE_KEY = 'heartimate-voice-id'
export const VOICE_SPEED_STORAGE_KEY = 'heartimate-voice-speed'

export function getStoredVoiceSpeed(): number {
  if (typeof window === 'undefined') return 1.0
  const stored = parseFloat(localStorage.getItem(VOICE_SPEED_STORAGE_KEY) || '1.0')
  return Number.isFinite(stored) ? stored : 1.0
}

export function getStoredVoiceUri(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(VOICE_ID_STORAGE_KEY)
}

export function sortSpeechVoices(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice[] {
  return [...voices].sort((a, b) => {
    const aEn = a.lang.toLowerCase().startsWith('en') ? 0 : 1
    const bEn = b.lang.toLowerCase().startsWith('en') ? 0 : 1
    if (aEn !== bEn) return aEn - bEn
    return a.name.localeCompare(b.name)
  })
}

export function loadSpeechVoices(): Promise<SpeechSynthesisVoice[]> {
  if (typeof window === 'undefined') return Promise.resolve([])

  return new Promise((resolve) => {
    const synth = window.speechSynthesis
    const existing = sortSpeechVoices(synth.getVoices())
    if (existing.length > 0) {
      resolve(existing)
      return
    }

    const finish = () => {
      synth.removeEventListener('voiceschanged', finish)
      resolve(sortSpeechVoices(synth.getVoices()))
    }

    synth.addEventListener('voiceschanged', finish)
    window.setTimeout(finish, 500)
  })
}

export function pickDefaultSpeechVoice(
  voices: SpeechSynthesisVoice[]
): SpeechSynthesisVoice | undefined {
  const preferredUri = getStoredVoiceUri()
  if (preferredUri) {
    const stored = voices.find((v) => v.voiceURI === preferredUri)
    if (stored) return stored
  }

  return voices.find(
    (v) =>
      v.name.includes('Female') ||
      v.name.includes('Samantha') ||
      v.name.includes('Victoria') ||
      v.name.includes('Karen') ||
      v.name.includes('Zira')
  )
}
