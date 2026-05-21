/**
 * Browser storage for Heartimate — single registry of keys and helpers.
 *
 * Kinds:
 * - **preference** — device UX toggles (survives refresh; not authoritative)
 * - **cache** — convenience data; safe to lose or rebuild
 * - **one_shot** — write once, read once (or until cleared)
 * - **session_ui** — per-tab UI state (scroll, animations)
 *
 * See docs/CLIENT_EPHEMERAL_STATE.md for product-level notes.
 */

import type { ForkPayload } from '@/lib/character-fork'

// --- Key registry (localStorage) ---

export const CLIENT_STORAGE_KEYS = {
  /** @kind preference — TTS on/off for this browser */
  voiceEnabled: 'heartimate-voice-enabled',
  /** @kind preference — auto-read assistant replies */
  autoRead: 'heartimate-auto-read',
  /** @kind cache — recent persona ids for sort order in picker */
  recentPersonas: 'heartimate-recent-personas',
  /** @kind cache — streak milestone ints already celebrated in UI */
  streakMilestonesCelebrated: 'heartimate.streak.milestones',
  /** @kind one_shot — set after onboarding; hint for first-run UX */
  newUser: 'heartimate_new_user',
} as const

// --- Key registry (sessionStorage) ---

export const CLIENT_SESSION_KEYS = {
  /** @kind one_shot — fork form payload between character detail → create */
  forkPayload: 'heartimate_fork',
  /** @kind session_ui — skip repeat app-shell enter animation this tab */
  appShellEntered: 'heartimate_app_shell_entered',
} as const

/** @kind session_ui — per-chat message list scrollTop */
export function chatScrollSessionKey(chatId: string): string {
  return `chat-scroll-${chatId}`
}

const MAX_RECENT_PERSONAS = 10

function isBrowser(): boolean {
  return typeof window !== 'undefined'
}

function readLocalRaw(key: string): string | null {
  if (!isBrowser()) return null
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeLocalRaw(key: string, value: string): void {
  if (!isBrowser()) return
  try {
    localStorage.setItem(key, value)
  } catch {
    // quota / private mode
  }
}

function removeLocalRaw(key: string): void {
  if (!isBrowser()) return
  try {
    localStorage.removeItem(key)
  } catch {
    // ignore
  }
}

function readSessionRaw(key: string): string | null {
  if (!isBrowser()) return null
  try {
    return sessionStorage.getItem(key)
  } catch {
    return null
  }
}

function writeSessionRaw(key: string, value: string): void {
  if (!isBrowser()) return
  try {
    sessionStorage.setItem(key, value)
  } catch {
    // ignore
  }
}

function removeSessionRaw(key: string): void {
  if (!isBrowser()) return
  try {
    sessionStorage.removeItem(key)
  } catch {
    // ignore
  }
}

function readLocalJson<T>(key: string): T | null {
  const raw = readLocalRaw(key)
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function writeLocalJson(key: string, value: unknown): void {
  writeLocalRaw(key, JSON.stringify(value))
}

function readLocalBool(key: string, defaultValue: boolean): boolean {
  const raw = readLocalRaw(key)
  if (raw === 'true') return true
  if (raw === 'false') return false
  return defaultValue
}

function writeLocalBool(key: string, value: boolean): void {
  writeLocalRaw(key, value ? 'true' : 'false')
}

// --- Preferences (localStorage) ---

export function getVoiceEnabled(defaultValue = false): boolean {
  return readLocalBool(CLIENT_STORAGE_KEYS.voiceEnabled, defaultValue)
}

export function setVoiceEnabled(enabled: boolean): void {
  writeLocalBool(CLIENT_STORAGE_KEYS.voiceEnabled, enabled)
}

export function getAutoRead(defaultValue = false): boolean {
  return readLocalBool(CLIENT_STORAGE_KEYS.autoRead, defaultValue)
}

export function setAutoRead(enabled: boolean): void {
  writeLocalBool(CLIENT_STORAGE_KEYS.autoRead, enabled)
}

// --- Cache: recent personas (localStorage) ---

export function getRecentPersonaIds(): string[] {
  const parsed = readLocalJson<unknown>(CLIENT_STORAGE_KEYS.recentPersonas)
  return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : []
}

export function recordRecentPersona(personaId: string | null): void {
  if (!personaId) return
  const current = getRecentPersonaIds().filter((id) => id !== personaId)
  writeLocalJson(CLIENT_STORAGE_KEYS.recentPersonas, [personaId, ...current].slice(0, MAX_RECENT_PERSONAS))
}

// --- Cache: streak celebrations (localStorage) ---

export function getCelebratedStreakMilestones(): Set<number> {
  const parsed = readLocalJson<number[]>(CLIENT_STORAGE_KEYS.streakMilestonesCelebrated)
  return new Set(Array.isArray(parsed) ? parsed.filter((n) => typeof n === 'number') : [])
}

export function markStreakMilestoneCelebrated(milestone: number): void {
  const done = getCelebratedStreakMilestones()
  done.add(milestone)
  writeLocalJson(CLIENT_STORAGE_KEYS.streakMilestonesCelebrated, Array.from(done))
}

// --- One-shot: new user hint (localStorage) ---

export function setNewUserHint(): void {
  writeLocalRaw(CLIENT_STORAGE_KEYS.newUser, 'true')
}

export function consumeNewUserHint(): boolean {
  const raw = readLocalRaw(CLIENT_STORAGE_KEYS.newUser)
  if (raw !== 'true') return false
  removeLocalRaw(CLIENT_STORAGE_KEYS.newUser)
  return true
}

// --- One-shot: fork payload (sessionStorage) ---

/** @deprecated use CLIENT_SESSION_KEYS.forkPayload */
export const FORK_STORAGE_KEY = CLIENT_SESSION_KEYS.forkPayload

export function setForkPayload(payload: ForkPayload): void {
  writeSessionRaw(CLIENT_SESSION_KEYS.forkPayload, JSON.stringify(payload))
}

export function consumeForkPayload(): ForkPayload | null {
  const raw = readSessionRaw(CLIENT_SESSION_KEYS.forkPayload)
  if (!raw) return null
  removeSessionRaw(CLIENT_SESSION_KEYS.forkPayload)
  try {
    return JSON.parse(raw) as ForkPayload
  } catch {
    return null
  }
}

// --- Session UI: app shell enter (sessionStorage) ---

/** Returns true the first time per tab; marks entered so animation does not repeat. */
export function claimAppShellEnterAnimation(): boolean {
  if (!isBrowser()) return false
  try {
    if (sessionStorage.getItem(CLIENT_SESSION_KEYS.appShellEntered)) return false
    sessionStorage.setItem(CLIENT_SESSION_KEYS.appShellEntered, '1')
    return true
  } catch {
    return false
  }
}

// --- Session UI: chat scroll (sessionStorage) ---

export function readChatScrollTop(chatId: string): number | null {
  const raw = readSessionRaw(chatScrollSessionKey(chatId))
  if (!raw) return null
  const y = parseInt(raw, 10)
  return Number.isNaN(y) || y <= 0 ? null : y
}

export function writeChatScrollTop(chatId: string, scrollTop: number): void {
  writeSessionRaw(chatScrollSessionKey(chatId), String(scrollTop))
}
