import type { SuggestedCharacter } from './CharacterSuggestedRail'

export interface CharacterDetailCharacter {
  id: string
  name: string
  avatar_url: string | null
  description: string | null
  personality: string | null
  scenario: string | null
  greeting: string | null
  example_dialogs: string | null
  tags: string[]
  is_nsfw: boolean
  likes_count: number
  chat_count: number
}

export interface CharacterDetailCreator {
  id: string
  display_name: string
  avatar_url?: string | null
}

export interface CharacterDetailStory {
  chatId: string
  affectionScore: number
  relationshipLevel: string
  totalMessages: number
  startedAt: string
  lastOpenedAt: string
}

export interface CharacterDetailClientProps {
  character: CharacterDetailCharacter
  creator: CharacterDetailCreator | null
  currentUserId: string | null
  currentUserAvatarUrl?: string | null
  isLiked: boolean
  suggested: SuggestedCharacter[]
  story?: CharacterDetailStory | null
  storyDays?: number
}

export const CHARACTER_DETAIL_ROSE = '#e8507a'

export const CHARACTER_DETAIL_DEFAULT_AVATAR =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%231a0e1c"/><circle cx="50" cy="35" r="20" fill="%23e8507a" opacity="0.4"/><path d="M20 80c0-15 15-25 30-25s30 10 30 25" fill="%23e8507a" opacity="0.4"/></svg>'
