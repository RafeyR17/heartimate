/**
 * In-process circuit breaker for OpenRouter moderation classifier.
 * After repeated failures, bypass classifier (heuristics only) until cooldown elapses.
 */

const DEFAULT_FAILURE_THRESHOLD = 3
const DEFAULT_COOLDOWN_MS = 60_000

function envInt(key: string, fallback: number): number {
  const raw = process.env[key]?.trim()
  if (!raw) return fallback
  const n = parseInt(raw, 10)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

export function moderationFailureThreshold(): number {
  return envInt('CHAT_MODERATION_CIRCUIT_FAILURES', DEFAULT_FAILURE_THRESHOLD)
}

export function moderationCircuitCooldownMs(): number {
  return envInt('CHAT_MODERATION_CIRCUIT_COOLDOWN_MS', DEFAULT_COOLDOWN_MS)
}

let consecutiveFailures = 0
let circuitOpenUntil = 0

export type ModerationCircuitSnapshot = {
  consecutiveFailures: number
  circuitOpen: boolean
  circuitOpenUntil: number
}

export function getModerationCircuitSnapshot(): ModerationCircuitSnapshot {
  const now = Date.now()
  return {
    consecutiveFailures,
    circuitOpen: now < circuitOpenUntil,
    circuitOpenUntil,
  }
}

export function resetModerationCircuitForTests(): void {
  consecutiveFailures = 0
  circuitOpenUntil = 0
}

export function isModerationCircuitOpen(now = Date.now()): boolean {
  if (circuitOpenUntil > 0 && now >= circuitOpenUntil) {
    circuitOpenUntil = 0
    consecutiveFailures = 0
  }
  return now < circuitOpenUntil
}

export function recordModerationClassifierSuccess(): void {
  consecutiveFailures = 0
  circuitOpenUntil = 0
}

export function recordModerationClassifierFailure(now = Date.now()): boolean {
  consecutiveFailures += 1
  const threshold = moderationFailureThreshold()
  if (consecutiveFailures >= threshold) {
    circuitOpenUntil = now + moderationCircuitCooldownMs()
    return true
  }
  return false
}
