import { describe, expect, it } from 'vitest'
import { getRelationshipLevel, shouldSpecialReply } from '@/lib/affection'

describe('shouldSpecialReply', () => {
  it('is false when affection unchanged within a tier', () => {
    const prev = getRelationshipLevel(30)
    const next = getRelationshipLevel(31)
    expect(shouldSpecialReply(prev, next, false)).toBe(false)
  })

  it('is false on non-peak level up', () => {
    const prev = getRelationshipLevel(50)
    const next = getRelationshipLevel(51)
    expect(prev.level).toBe('acquaintance')
    expect(next.level).toBe('friend')
    expect(shouldSpecialReply(prev, next, true)).toBe(false)
  })

  it('is true on peak level up to obsessed', () => {
    const prev = getRelationshipLevel(500)
    const next = getRelationshipLevel(501)
    expect(next.level).toBe('obsessed')
    expect(shouldSpecialReply(prev, next, true)).toBe(true)
  })

  it('is true when crossing into intimate', () => {
    const prev = getRelationshipLevel(200)
    const next = getRelationshipLevel(201)
    expect(prev.level).not.toBe('intimate')
    expect(next.level).toBe('intimate')
    expect(shouldSpecialReply(prev, next, true)).toBe(true)
  })

  it('is true when crossing into devoted', () => {
    const prev = getRelationshipLevel(350)
    const next = getRelationshipLevel(351)
    expect(prev.level).not.toBe('devoted')
    expect(next.level).toBe('devoted')
    expect(shouldSpecialReply(prev, next, true)).toBe(true)
  })
})
