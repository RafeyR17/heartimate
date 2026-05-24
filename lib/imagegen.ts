export type CharacterImageInput = {
  name: string
  description?: string
  personality?: string
  tags?: string[]
  gender?: string
}

const POLLINATIONS_BASE = 'https://image.pollinations.ai/prompt'

const TAG_STYLE_MAP: Record<string, string> = {
  'Dark Fantasy':
    'dark fantasy aesthetic, mystical aura, ethereal dark energy, fantasy costume',
  Yandere:
    'intense obsessive eyes, unsettling beautiful smile, slightly unhinged expression',
  Cyberpunk:
    'cyberpunk aesthetic, neon accents, futuristic clothing, tech implants',
  Supernatural:
    'supernatural beauty, subtle glowing eyes, otherworldly presence',
  Historical:
    'historical period costume, elegant aristocratic clothing, regal posture',
  Romance:
    'soft romantic lighting, warm inviting expression, elegant styling',
  Dominant:
    'commanding dominant presence, confident powerful posture, intense gaze',
  Submissive:
    'soft gentle eyes, vulnerable sweet expression, delicate features',
  'Soft Dom':
    'gentle but commanding presence, warm intensity, knowing smile',
  Horror:
    'dark horror aesthetic, eerie unsettling beauty, gothic atmosphere',
  'Sci-Fi': 'sci-fi aesthetic, futuristic outfit, space age styling',
  Vampire:
    'vampire aesthetic, pale perfect skin, dark elegant clothing, piercing eyes',
  Angel:
    'angelic beauty, ethereal white glow, divine features, soft light',
  Demon:
    'dark demonic energy, smoldering dangerous beauty, dark aura',
  Warrior:
    'warrior aesthetic, battle armor, strong confident stance, fierce expression',
  Royalty:
    'royal elegant clothing, crown or regal accessories, noble bearing',
  'Enemies to Lovers':
    'cold sharp features, guarded expression hiding desire, magnetic tension',
  Obsessive:
    'intensely focused eyes, barely contained emotion, beautiful and dangerous',
  Protective:
    'strong protective stance, warm but fierce eyes, guardian energy',
  'Forbidden Love':
    'forbidden longing in eyes, bittersweet expression, magnetic pull',
  'Slow Burn':
    'restrained emotion, longing gaze, tension in every feature',
  'Monster/Non-human':
    'non-human beautiful creature, fantasy creature features, otherworldly',
  Possessive:
    'possessive intensity in eyes, claiming energy, dangerous attraction',
}

const VISUAL_KEYWORDS = [
  'blonde',
  'brunette',
  'silver',
  'white',
  'black hair',
  'red hair',
  'dark hair',
  'long hair',
  'short hair',
  'curly',
  'blue eyes',
  'green eyes',
  'brown eyes',
  'purple eyes',
  'golden eyes',
  'glowing eyes',
  'tattoos',
  'scars',
  'freckles',
  'pale',
  'tan',
  'dark skin',
  'athletic',
  'tall',
  'elegant',
  'gothic',
  'casual',
  'formal',
  'leather',
  'silk',
  'armor',
  'suit',
]

function extractKeywords(description: string): string {
  const lower = description.toLowerCase()
  return VISUAL_KEYWORDS.filter((word) => lower.includes(word))
    .slice(0, 4)
    .join(', ')
}

export function detectCharacterGender(
  character: CharacterImageInput
): 'male' | 'female' | 'nonbinary' {
  const allText = [
    character.description || '',
    character.personality || '',
    character.tags?.join(' ') || '',
    character.gender || '',
  ]
    .join(' ')
    .toLowerCase()

  if (character.gender === 'Female') return 'female'
  if (character.gender === 'Male') return 'male'
  if (
    character.gender === 'Non-binary' ||
    allText.includes('non-binary') ||
    allText.includes('androgynous')
  ) {
    return 'nonbinary'
  }

  const isMale =
    allText.includes('he/him') ||
    allText.includes(' he ') ||
    allText.includes(' his ') ||
    allText.includes('male') ||
    allText.includes(' man ') ||
    allText.includes(' boy ')

  if (isMale) return 'male'
  return 'female'
}

/** Build a Pollinations prompt from character fields. */
export function buildCharacterImagePrompt(character: CharacterImageInput): string {
  const gender = detectCharacterGender(character)

  const baseAppearance =
    gender === 'nonbinary'
      ? 'androgynous ethereally beautiful person, perfect symmetrical features'
      : gender === 'male'
        ? 'extremely handsome man, sharp jawline, intense smoldering eyes, perfect features'
        : 'breathtakingly beautiful woman, perfect features, captivating eyes, flawless skin'

  const tagStyles =
    character.tags
      ?.map((tag) => TAG_STYLE_MAP[tag])
      .filter(Boolean)
      .slice(0, 3)
      .join(', ') || ''

  const descKeywords = extractKeywords(character.description || '')

  return [
    `portrait of ${baseAppearance}`,
    descKeywords,
    tagStyles,
    'dramatic rose and deep magenta rim lighting',
    'deep black background',
    'cinematic studio lighting',
    'staring directly into camera',
    'intense magnetic gaze',
    'ultra realistic',
    'photorealistic',
    '8k resolution',
    'highly detailed',
    'sharp focus',
    'cinematic color grading',
    'dark luxury aesthetic',
    'editorial fashion photography',
  ]
    .filter(Boolean)
    .join(', ')
}

export function generateImageUrl(
  prompt: string,
  options?: {
    width?: number
    height?: number
    seed?: number
    enhance?: boolean
  }
): string {
  const {
    width = 512,
    height = 768,
    seed = Math.floor(Math.random() * 999_999),
    enhance = true,
  } = options ?? {}

  const encodedPrompt = encodeURIComponent(prompt)
  const enhanceParam = enhance ? 'true' : 'false'
  return `${POLLINATIONS_BASE}/${encodedPrompt}?width=${width}&height=${height}&seed=${seed}&model=flux&nologo=true&enhance=${enhanceParam}`
}

export function generateVariationUrls(
  prompt: string,
  count = 3,
  options?: { width?: number; height?: number }
): string[] {
  const seeds = new Set<number>()
  while (seeds.size < count) {
    seeds.add(Math.floor(Math.random() * 999_999))
  }
  return [...seeds].map((seed) =>
    generateImageUrl(prompt, { ...options, seed })
  )
}

/** Server-side: verify Pollinations URL responds with an image. */
export async function verifyImageUrlLoads(
  url: string,
  timeoutMs = 30_000
): Promise<boolean> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      cache: 'no-store',
    })
    const type = res.headers.get('content-type') ?? ''
    return res.ok && type.startsWith('image/')
  } catch {
    return false
  } finally {
    clearTimeout(timeout)
  }
}

export function getDetectedGenderLabel(character: CharacterImageInput): string {
  const g = detectCharacterGender(character)
  if (g === 'male') return 'Male'
  if (g === 'nonbinary') return 'Non-binary'
  return 'Female'
}

export { POLLINATIONS_BASE }
