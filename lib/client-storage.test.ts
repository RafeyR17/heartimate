import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  CLIENT_SESSION_KEYS,
  CLIENT_STORAGE_KEYS,
  chatScrollSessionKey,
  consumeForkPayload,
  getRecentPersonaIds,
  recordRecentPersona,
  setForkPayload,
} from './client-storage'

describe('client-storage', () => {
  beforeEach(() => {
    vi.stubGlobal('window', {} as Window)
    const localStore: Record<string, string> = {}
    vi.stubGlobal('localStorage', {
      getItem(k: string) {
        return localStore[k] ?? null
      },
      setItem(k: string, v: string) {
        localStore[k] = v
      },
      removeItem(k: string) {
        delete localStore[k]
      },
    })
    
    const sessionStore: Record<string, string> = {}
    vi.stubGlobal('sessionStorage', {
      getItem(k: string) {
        return sessionStore[k] ?? null
      },
      setItem(k: string, v: string) {
        sessionStore[k] = v
      },
      removeItem(k: string) {
        delete sessionStore[k]
      },
    })
  })

  it('recordRecentPersona caps list', () => {
    for (let i = 0; i < 12; i++) recordRecentPersona(`p${i}`)
    expect(getRecentPersonaIds()).toHaveLength(10)
    expect(getRecentPersonaIds()[0]).toBe('p11')
  })

  it('consumeForkPayload is one-shot', () => {
    setForkPayload({
      fork: {
        name: 'A',
        description: '',
        personality: '',
        scenario: '',
        greeting: '',
        exampleDialogs: [],
        tags: [],
        isNsfw: false,
        isPublic: true,
        avatarUrl: '',
      },
      forkedFrom: { id: 'c1', name: 'Src' },
    })
    expect(consumeForkPayload()?.fork.name).toBe('A')
    expect(consumeForkPayload()).toBeNull()
  })

  it('chatScrollSessionKey is per chat', () => {
    expect(chatScrollSessionKey('abc')).toBe('chat-scroll-abc')
    expect(CLIENT_STORAGE_KEYS.recentPersonas).toBe('heartimate-recent-personas')
    expect(CLIENT_SESSION_KEYS.forkPayload).toBe('heartimate_fork')
  })
})
