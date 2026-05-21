export interface ProfileUser {
  id: string
  display_name: string
  bio: string | null
  avatar_url: string | null
  is_premium: boolean
  created_at: string
}

export interface ProfileCharacter {
  id: string
  name: string
  avatar_url: string | null
  description: string | null
  tags: string[] | null
  is_nsfw: boolean
  is_public: boolean
  likes_count?: number
  chat_count?: number
  created_at: string
}

export interface ProfileChat {
  id: string
  last_message_at: string | null
  character: {
    id: string
    name: string
    avatar_url: string | null
  } | null
  lastMessage: {
    role: string
    content: string
    created_at: string
  } | null
}

export interface ProfileFavorite {
  likeId: string
  character: ProfileCharacter
}

export interface ProfilePersona {
  id: string
  name: string
  avatar_url: string | null
  short_bio: string | null
  appearance: string | null
  created_at: string
}

export interface ProfileOverviewStats {
  mostChatted: {
    name: string
    avatar_url: string | null
    messageCount: number
  } | null
  newestCharacter: ProfileCharacter | null
  topTag: string | null
  memberDays: number
}

export interface ProfileCounts {
  characters: number
  chats: number
  favorites: number
  personas: number
}
