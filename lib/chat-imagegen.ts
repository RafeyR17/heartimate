import { buildCharacterImagePrompt, type CharacterImageInput } from '@/lib/imagegen'

const SCENE_STYLE =
  'cinematic photography, dramatic rose and magenta lighting, dark luxury aesthetic, ultra realistic 8k, photorealistic'

const INTIMACY_STYLES: Record<string, string> = {
  stranger: 'standing at a distance, mysterious pose, cinematic',
  acquaintance: 'casual relaxed pose, soft smile, warm lighting',
  friend: 'close friendly pose, genuine smile, inviting atmosphere',
  intimate: 'close intimate pose, intense eye contact, sensual lighting',
  devoted: 'deeply intimate, passionate energy, rose rim lighting',
  obsessed: 'obsessively close, possessive energy, dramatic lighting',
}

function normalizeRelationshipLevel(level?: string): string {
  const key = (level ?? 'stranger').toLowerCase().trim()
  if (key in INTIMACY_STYLES) return key
  return 'stranger'
}

/** Build a scene prompt for in-chat image generation. */
export function buildScenePrompt(
  character: CharacterImageInput,
  userRequest?: string | null,
  relationshipLevel?: string
): string {
  if (userRequest?.trim()) {
    return `${userRequest.trim()}, ${SCENE_STYLE}`
  }

  const intimacyStyle =
    INTIMACY_STYLES[normalizeRelationshipLevel(relationshipLevel)] ??
    INTIMACY_STYLES.stranger

  const basePrompt = buildCharacterImagePrompt(character)
  return `${basePrompt}, ${intimacyStyle}`
}

export function generateChatImageUrl(
  prompt: string,
  options?: { width?: number; height?: number; seed?: number }
): string {
  const {
    width = 512,
    height = 512,
    seed = Math.floor(Math.random() * 999_999),
  } = options ?? {}

  const encoded = encodeURIComponent(prompt)
  return `https://image.pollinations.ai/prompt/${encoded}?width=${width}&height=${height}&seed=${seed}&model=flux&nologo=true&enhance=false`
}

export function generateChatImageVariations(
  prompt: string,
  count = 3
): string[] {
  const seeds = new Set<number>()
  while (seeds.size < count) {
    seeds.add(Math.floor(Math.random() * 999_999))
  }
  return [...seeds].map((seed) => generateChatImageUrl(prompt, { seed }))
}
