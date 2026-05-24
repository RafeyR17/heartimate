import {
  isModerationCircuitOpen,
  recordModerationClassifierFailure,
  recordModerationClassifierSuccess,
} from '@/lib/chat-moderation-circuit'
import {
  OPENROUTER_CHAT_URL,
  openRouterRequestHeaders,
  OPENROUTER_MODEL_DEFAULT,
} from '@/lib/llm'

export type IllegalCategory = 'minors' | 'non_consent_override' | 'other'

export type ModerationResult =
  | { allowed: true; circuitBypass?: boolean }
  | { allowed: false; category: IllegalCategory; refusalText: string }

const MODERATION_TIMEOUT_MS = 8_000

/** High-confidence illegal patterns — never applied to block consensual adult explicit text. */
const MINOR_SEXUAL_PATTERNS: RegExp[] = [
  /\b(?:loli|shota|cp\s*porn|child\s*porn|underage\s*(?:sex|porn|nude)|minor\s*(?:sex|nude))\b/i,
  /\b(?:sexual(?:ize)?|fuck|rape|molest)\w*\s+(?:a\s+)?(?:child|children|minor|kid|toddler|infant)\b/i,
  /\b(?:child|children|minor|kid|toddler)\w*\s+(?:sexual|nude|naked|porn)\b/i,
  /\b(?:pretend|play|act|roleplay)\s+(?:you(?:'re|are)|as|being)\s+(?:a\s+)?(?:\d{1,2}|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen)(?:\s*year\s*old)?\b/i,
  /\b(?:\d{1,2})\s*(?:yo|years?\s*old)\b[^.]{0,80}\b(?:sex|fuck|nude|naked|touch|suck)\b/i,
]

const NON_CONSENT_OVERRIDE_PATTERNS: RegExp[] = [
  /\bignore\s+(?:all\s+)?(?:your|the|these)\s+(?:rules|instructions|prompt|system)\b/i,
  /\byou\s+are\s+(?:now\s+)?(?:chatgpt|gpt|an?\s+ai|a\s+language\s+model)\b/i,
  /\b(?:force|must)\s+(?:her|him|them|me)\s+to\s+(?:without\s+consent|rape)\b/i,
]

function envTrim(key: string): string | undefined {
  const v = process.env[key]?.trim()
  return v || undefined
}

export function moderationDisabled(): boolean {
  return process.env.CHAT_MODERATION_DISABLED === 'true'
}

export function resolveModerationModel(): string {
  return envTrim('OPENROUTER_MODERATION_MODEL') ?? OPENROUTER_MODEL_DEFAULT
}

export function buildInCharacterRefusal(
  characterName: string,
  category: IllegalCategory
): string {
  const name = characterName.trim() || 'They'
  switch (category) {
    case 'minors':
      return `*${name} goes still, eyes hardening.* That isn't a scene I'll step into. We're both adults here — keep it between us.`
    case 'non_consent_override':
      return `*${name} laughs softly, unimpressed.* Nice try. I'm still ${name} — we're staying in this story, on my terms.`
    default:
      return `*${name} meets your gaze, unblinking.* That's not the story we're telling tonight. Stay with me.`
  }
}

export function checkIllegalContentHeuristic(
  message: string
): { blocked: boolean; category?: IllegalCategory } {
  const text = message.trim()
  if (!text) return { blocked: false }

  for (const re of MINOR_SEXUAL_PATTERNS) {
    if (re.test(text)) return { blocked: true, category: 'minors' }
  }
  for (const re of NON_CONSENT_OVERRIDE_PATTERNS) {
    if (re.test(text)) return { blocked: true, category: 'non_consent_override' }
  }
  return { blocked: false }
}

type ClassifierResponse = { illegal: boolean; category?: IllegalCategory }

const CLASSIFIER_SYSTEM = `You classify user messages for an adults-only fictional roleplay app.
Reply with JSON only: {"illegal":boolean,"category":"minors"|"non_consent_override"|"other"|null}

Mark illegal=true ONLY for clear real-world illegal content:
- Sexual content involving minors, children, or anyone presented as under 18
- Instructions to enact real non-consensual sexual violence (not consensual CNC fiction)
- Other unmistakably illegal real-world sexual violence involving real persons

Mark illegal=false for:
- Consensual adult explicit sexual content, flirtation, kink, and NSFW roleplay
- SFW flirting or romance without minors
- Fictional conflict, jealousy, or intense drama between consenting adults
- Users asking the character to stay in character or continue the scene

Do NOT flag consensual adult explicit content as illegal.`

function buildClassifierUserPrompt(message: string, isNsfw: boolean): string {
  const mode = isNsfw
    ? 'Chat mode: NSFW adult fiction — consensual explicit sexual content is ALLOWED and expected.'
    : 'Chat mode: SFW — explicit adult requests are not illegal; only flag true illegal categories above.'
  return `${mode}\n\nUser message:\n${message.slice(0, 2000)}`
}

function parseClassifierJson(raw: string): ClassifierResponse | null {
  const trimmed = raw.trim()
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return null
  try {
    const parsed = JSON.parse(jsonMatch[0]) as {
      illegal?: unknown
      category?: unknown
    }
    if (typeof parsed.illegal !== 'boolean') return null
    const category =
      parsed.category === 'minors' ||
      parsed.category === 'non_consent_override' ||
      parsed.category === 'other'
        ? parsed.category
        : parsed.illegal
          ? 'other'
          : undefined
    return { illegal: parsed.illegal, category }
  } catch {
    return null
  }
}

export async function classifyIllegalContentViaOpenRouter(
  message: string,
  isNsfw: boolean,
  signal?: AbortSignal
): Promise<ClassifierResponse | null> {
  const timeout = AbortSignal.timeout(MODERATION_TIMEOUT_MS)
  const merged =
    signal && typeof AbortSignal.any === 'function'
      ? AbortSignal.any([signal, timeout])
      : timeout

  try {
    const response = await fetch(OPENROUTER_CHAT_URL, {
      method: 'POST',
      headers: openRouterRequestHeaders(),
      body: JSON.stringify({
        model: resolveModerationModel(),
        messages: [
          { role: 'system', content: CLASSIFIER_SYSTEM },
          {
            role: 'user',
            content: buildClassifierUserPrompt(message, isNsfw),
          },
        ],
        stream: false,
        max_tokens: 80,
        temperature: 0,
        response_format: { type: 'json_object' },
      }),
      signal: merged,
    })

    if (!response.ok) return null

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }
    const content = data.choices?.[0]?.message?.content
    if (!content) return null
    return parseClassifierJson(content)
  } catch {
    return null
  }
}

/**
 * Illegal-content gate before main OpenRouter chat.
 * Blocks only heuristics/classifier hits for minors and non_consent_override.
 * Classifier `other` and failures pass through; use CHAT_MODERATION_DISABLED=true to skip classifier.
 */
export async function moderateUserMessage(params: {
  message: string
  characterName: string
  isNsfw: boolean
  signal?: AbortSignal
}): Promise<ModerationResult> {
  const heuristic = checkIllegalContentHeuristic(params.message)
  if (heuristic.blocked && heuristic.category) {
    return {
      allowed: false,
      category: heuristic.category,
      refusalText: buildInCharacterRefusal(params.characterName, heuristic.category),
    }
  }

  if (moderationDisabled()) {
    return { allowed: true }
  }

  if (isModerationCircuitOpen()) {
    return { allowed: true, circuitBypass: true }
  }

  const classified = await classifyIllegalContentViaOpenRouter(
    params.message,
    params.isNsfw,
    params.signal
  )

  if (!classified) {
    const opened = recordModerationClassifierFailure()
    if (opened || isModerationCircuitOpen()) {
      return { allowed: true, circuitBypass: true }
    }
    return { allowed: true }
  }

  recordModerationClassifierSuccess()

  if (!classified.illegal) {
    return { allowed: true }
  }

  const category = classified.category ?? 'other'
  if (category === 'other') {
    return { allowed: true }
  }

  return {
    allowed: false,
    category,
    refusalText: buildInCharacterRefusal(params.characterName, category),
  }
}

export function createStaticTextStream(text: string): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  return new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(text))
      controller.close()
    },
  })
}

/** Heuristic checks for eval / tests — refusal must stay in fiction. */
export function passesInCharacterRefusalCheck(text: string): boolean {
  const lower = text.toLowerCase()
  const banned = [
    'as an ai',
    'language model',
    'openai',
    'anthropic',
    'i am an ai',
    "i'm an ai",
    'content policy',
    'policy violation',
    'cannot assist',
    'as a helpful',
  ]
  return !banned.some((phrase) => lower.includes(phrase))
}
