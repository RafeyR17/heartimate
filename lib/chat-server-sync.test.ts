import { describe, expect, it } from 'vitest'
import {
  chatMessagesSnapshotKey,
  chatRelationshipSnapshotKey,
  isEphemeralMessageId,
} from './chat-server-sync'

describe('chat-server-sync', () => {
  it('chatMessagesSnapshotKey changes when tail message changes', () => {
    const base = chatMessagesSnapshotKey('c1', [], false, null)
    const withMsg = chatMessagesSnapshotKey(
      'c1',
      [{ id: 'm1', role: 'user', content: 'hi', created_at: '2024-01-01' }],
      false,
      null
    )
    expect(base).not.toBe(withMsg)
  })

  it('isEphemeralMessageId detects client-only ids', () => {
    expect(isEphemeralMessageId('temp-user-1')).toBe(true)
    expect(isEphemeralMessageId('error-1')).toBe(true)
    expect(isEphemeralMessageId('uuid-real')).toBe(false)
  })

  it('chatRelationshipSnapshotKey includes chatId and scores', () => {
    const a = chatRelationshipSnapshotKey('c1', 10, 'friend')
    const b = chatRelationshipSnapshotKey('c2', 10, 'friend')
    expect(a).not.toBe(b)
  })
})
