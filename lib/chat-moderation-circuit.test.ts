import { afterEach, describe, expect, it } from 'vitest'
import {
  getModerationCircuitSnapshot,
  isModerationCircuitOpen,
  moderationFailureThreshold,
  recordModerationClassifierFailure,
  recordModerationClassifierSuccess,
  resetModerationCircuitForTests,
} from '@/lib/chat-moderation-circuit'

describe('moderation circuit breaker', () => {
  afterEach(() => {
    resetModerationCircuitForTests()
  })

  it('opens after threshold failures', () => {
    const threshold = moderationFailureThreshold()
    for (let i = 0; i < threshold - 1; i++) {
      expect(recordModerationClassifierFailure()).toBe(false)
      expect(isModerationCircuitOpen()).toBe(false)
    }
    expect(recordModerationClassifierFailure()).toBe(true)
    expect(isModerationCircuitOpen()).toBe(true)
  })

  it('resets on success', () => {
    recordModerationClassifierFailure()
    recordModerationClassifierFailure()
    recordModerationClassifierFailure()
    recordModerationClassifierSuccess()
    expect(getModerationCircuitSnapshot().circuitOpen).toBe(false)
    expect(getModerationCircuitSnapshot().consecutiveFailures).toBe(0)
  })
})
