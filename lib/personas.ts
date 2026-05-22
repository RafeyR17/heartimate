import type { SupabaseClient } from '@supabase/supabase-js'
import {
  DEFAULT_PERSONA_NAME,
  type Persona,
} from '@/lib/persona-constants'
import { serverLog } from '@/lib/server-log'

export { DEFAULT_PERSONA_NAME, type Persona, type PersonaInput } from '@/lib/persona-constants'

export async function ensureDefaultPersona(
  supabase: SupabaseClient,
  userId: string,
  displayName?: string
): Promise<Persona | null> {
  const { data: existing } = await supabase
    .from('personas')
    .select('*')
    .eq('user_id', userId)
    .limit(1)

  if (existing && existing.length > 0) {
    return null
  }

  const { data: created, error } = await supabase
    .from('personas')
    .insert({
      user_id: userId,
      name: DEFAULT_PERSONA_NAME,
      short_bio: displayName
        ? `The real ${displayName} — your authentic self in every story.`
        : 'Your authentic self in every story.',
      appearance:
        'Average build with an approachable presence. Dressed casually but with quiet confidence — someone who could blend in or stand out depending on the room.',
      personality:
        'Warm, curious, and emotionally present. Speaks naturally with humor when comfortable and sincerity when it matters. Adapts to the moment without losing authenticity.',
    })
    .select()
    .single()

  if (error) {
    serverLog.error('personas', 'Failed to create default persona', error)
    return null
  }

  return created as Persona
}
