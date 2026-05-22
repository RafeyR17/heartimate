/** Shared persona types/constants safe for client and server bundles. */

export const DEFAULT_PERSONA_NAME = 'My Default Self'

export interface Persona {
  id: string
  user_id: string
  name: string
  avatar_url: string | null
  short_bio: string | null
  appearance: string | null
  personality: string | null
  created_at: string
  updated_at: string
}

export type PersonaInput = {
  name: string
  short_bio?: string
  appearance?: string
  personality?: string
  avatar_url?: string | null
}
