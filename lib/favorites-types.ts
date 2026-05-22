/** Character row for the dedicated /favorites page (liked + creator). */
export type FavoriteCharacter = {
  id: string
  name: string
  avatar_url: string | null
  description: string | null
  tags: string[] | null
  is_nsfw: boolean
  likes_count: number
  chat_count: number
  user_id: string
  creator_display_name: string | null
  /** character_likes.created_at — preserves "recently added" order */
  liked_at: string
}
