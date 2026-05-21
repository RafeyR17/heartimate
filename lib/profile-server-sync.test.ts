import { describe, expect, it } from 'vitest'
import { profileSnapshotKey } from './profile-server-sync'

describe('profileSnapshotKey', () => {
  const base = {
    user: {
      id: 'u1',
      display_name: 'A',
      bio: null,
      avatar_url: null,
      is_premium: false,
      created_at: '2024-01-01',
    },
    counts: { characters: 1, chats: 0, favorites: 0, personas: 0 },
    characters: [
      {
        id: 'c1',
        name: 'X',
        avatar_url: null,
        description: null,
        tags: [],
        is_nsfw: false,
        is_public: true,
        likes_count: 0,
        chat_count: 0,
        created_at: '2024-01-01',
      },
    ],
    chats: [],
    favorites: [],
    personas: [],
  }

  it('changes when counts change', () => {
    const a = profileSnapshotKey(base)
    const b = profileSnapshotKey({
      ...base,
      counts: { ...base.counts, characters: 0 },
      characters: [],
    })
    expect(a).not.toBe(b)
  })
})
