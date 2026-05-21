import type {
  ProfileCharacter,
  ProfileChat,
  ProfileCounts,
  ProfileFavorite,
  ProfilePersona,
  ProfileUser,
} from '@/lib/profile-types'

export interface ProfileServerSnapshotInput {
  user: ProfileUser
  counts: ProfileCounts
  characters: ProfileCharacter[]
  chats: ProfileChat[]
  favorites: ProfileFavorite[]
  personas: ProfilePersona[]
}

/** Fingerprint of RSC profile bundle for client resync after router.refresh(). */
export function profileSnapshotKey(input: ProfileServerSnapshotInput): string {
  const { user, counts, characters, chats, favorites, personas } = input
  return [
    user.id,
    user.display_name,
    user.bio ?? '',
    user.avatar_url ?? '',
    counts.characters,
    counts.chats,
    counts.favorites,
    counts.personas,
    characters[0]?.id ?? '',
    chats[0]?.id ?? '',
    favorites[0]?.character.id ?? '',
    personas[0]?.id ?? '',
  ].join('|')
}
