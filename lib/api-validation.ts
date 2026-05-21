/**
 * Field limits for API validation (Zod schemas in lib/api-schemas.ts use these).
 */

export const MAX_DISPLAY_NAME_LENGTH = 50
export const MAX_USER_BIO_LENGTH = 280
export const MAX_REPORT_DETAILS_LENGTH = 1_000
export const MAX_ONBOARDING_KINK_PREFS = 24
export const MAX_KINK_PREF_LENGTH = 48
export const MAX_CHAT_TITLE_LENGTH = 120

export const MAX_CHARACTER_NAME_LENGTH = 80
/** Card/explore blurb — longer than legacy 120; still shorter than personality. */
export const MAX_CHARACTER_DESCRIPTION_LENGTH = 500
export const MAX_CHARACTER_PERSONALITY_LENGTH = 8_000
export const MAX_CHARACTER_SCENARIO_LENGTH = 8_000
export const MAX_CHARACTER_GREETING_LENGTH = 2_000
export const MAX_CHARACTER_EXAMPLE_DIALOGS_LENGTH = 32_000
export const MAX_CHARACTER_TAGS = 12
export const MAX_CHARACTER_TAG_LENGTH = 40

export const MAX_PERSONA_NAME_LENGTH = 80
export const MAX_PERSONA_SHORT_BIO_LENGTH = 2_000
export const MAX_PERSONA_APPEARANCE_LENGTH = 2_000
export const MAX_PERSONA_PERSONALITY_LENGTH = 2_000

export type ValidationFail = { ok: false; error: string; status?: number }
export type ValidationOk<T> = { ok: true; value: T }
export type ValidationResult<T> = ValidationOk<T> | ValidationFail

export function trimString(value: unknown, max: number): string {
  if (value == null) return ''
  return String(value).trim().slice(0, max)
}

export function requireNonEmptyString(
  value: unknown,
  label: string,
  max: number
): ValidationResult<string> {
  const trimmed = trimString(value, max)
  if (!trimmed) {
    return { ok: false, error: `${label} is required`, status: 400 }
  }
  return { ok: true, value: trimmed }
}

export function validateMaxLength(
  fields: Array<{ label: string; value: string; max: number }>
): ValidationFail | null {
  for (const { label, value, max } of fields) {
    if (value.length > max) {
      return {
        ok: false,
        error: `${label} must be ${max} characters or less`,
        status: 400,
      }
    }
  }
  return null
}

export function parseTagsField(raw: unknown): ValidationResult<string[]> {
  const str = typeof raw === 'string' ? raw : '[]'
  let parsed: unknown
  try {
    parsed = JSON.parse(str || '[]')
  } catch {
    return { ok: false, error: 'Invalid tags JSON', status: 400 }
  }
  if (!Array.isArray(parsed)) {
    return { ok: false, error: 'Tags must be an array', status: 400 }
  }
  if (parsed.length > MAX_CHARACTER_TAGS) {
    return {
      ok: false,
      error: `At most ${MAX_CHARACTER_TAGS} tags allowed`,
      status: 400,
    }
  }
  const tags: string[] = []
  for (const item of parsed) {
    if (typeof item !== 'string') {
      return { ok: false, error: 'Each tag must be a string', status: 400 }
    }
    const tag = item.trim().slice(0, MAX_CHARACTER_TAG_LENGTH)
    if (tag) tags.push(tag)
  }
  return { ok: true, value: tags }
}

export function validateExampleDialogsField(
  raw: unknown
): ValidationResult<string> {
  const str = trimString(raw ?? '[]', MAX_CHARACTER_EXAMPLE_DIALOGS_LENGTH)
  if (str.length > MAX_CHARACTER_EXAMPLE_DIALOGS_LENGTH) {
    return {
      ok: false,
      error: `Example dialogs must be ${MAX_CHARACTER_EXAMPLE_DIALOGS_LENGTH} characters or less`,
      status: 400,
    }
  }
  if (!str) return { ok: true, value: '[]' }
  try {
    JSON.parse(str)
  } catch {
    return { ok: false, error: 'Invalid example dialogs JSON', status: 400 }
  }
  return { ok: true, value: str }
}

export type CharacterFormInput = {
  name: string
  description: string
  personality: string
  scenario: string
  greeting: string
  exampleDialogs: string
  tags: string[]
}

export function validateCharacterFormInput(
  raw: Record<string, unknown>
): ValidationResult<CharacterFormInput> {
  const nameResult = requireNonEmptyString(
    raw.name,
    'Name',
    MAX_CHARACTER_NAME_LENGTH
  )
  if (!nameResult.ok) return nameResult

  const personalityResult = requireNonEmptyString(
    raw.personality,
    'Personality',
    MAX_CHARACTER_PERSONALITY_LENGTH
  )
  if (!personalityResult.ok) return personalityResult

  const greetingResult = requireNonEmptyString(
    raw.greeting,
    'Greeting',
    MAX_CHARACTER_GREETING_LENGTH
  )
  if (!greetingResult.ok) return greetingResult

  const description = trimString(raw.description, MAX_CHARACTER_DESCRIPTION_LENGTH)
  const scenario = trimString(raw.scenario, MAX_CHARACTER_SCENARIO_LENGTH)

  const lengthErr = validateMaxLength([
    { label: 'Description', value: description, max: MAX_CHARACTER_DESCRIPTION_LENGTH },
    { label: 'Scenario', value: scenario, max: MAX_CHARACTER_SCENARIO_LENGTH },
  ])
  if (lengthErr) return lengthErr

  const tagsResult = parseTagsField(raw.tagsRaw)
  if (!tagsResult.ok) return tagsResult

  const examplesResult = validateExampleDialogsField(raw.exampleDialogs)
  if (!examplesResult.ok) return examplesResult

  return {
    ok: true,
    value: {
      name: nameResult.value,
      description,
      personality: personalityResult.value,
      scenario,
      greeting: greetingResult.value,
      exampleDialogs: examplesResult.value,
      tags: tagsResult.value,
    },
  }
}

export type PersonaFormInput = {
  name: string
  short_bio: string | null
  appearance: string | null
  personality: string | null
}

export function validatePersonaFormInput(
  raw: Record<string, unknown>
): ValidationResult<PersonaFormInput> {
  const nameResult = requireNonEmptyString(
    raw.name,
    'Name',
    MAX_PERSONA_NAME_LENGTH
  )
  if (!nameResult.ok) return nameResult

  const short_bio = trimString(raw.short_bio, MAX_PERSONA_SHORT_BIO_LENGTH) || null
  const appearance =
    trimString(raw.appearance, MAX_PERSONA_APPEARANCE_LENGTH) || null
  const personality =
    trimString(raw.personality, MAX_PERSONA_PERSONALITY_LENGTH) || null

  const lengthErr = validateMaxLength([
    { label: 'Short bio', value: short_bio ?? '', max: MAX_PERSONA_SHORT_BIO_LENGTH },
    { label: 'Appearance', value: appearance ?? '', max: MAX_PERSONA_APPEARANCE_LENGTH },
    {
      label: 'Personality',
      value: personality ?? '',
      max: MAX_PERSONA_PERSONALITY_LENGTH,
    },
  ])
  if (lengthErr) return lengthErr

  return {
    ok: true,
    value: {
      name: nameResult.value,
      short_bio,
      appearance,
      personality,
    },
  }
}

/** PATCH persona: validate only fields present in the form (null = field omitted). */
export function validatePersonaPatchFields(
  raw: Record<string, unknown | null>
): ValidationResult<Partial<PersonaFormInput>> {
  const updates: Partial<PersonaFormInput> = {}
  const lengthChecks: Array<{ label: string; value: string; max: number }> = []

  if (raw.name !== null && raw.name !== undefined) {
    const nameResult = requireNonEmptyString(raw.name, 'Name', MAX_PERSONA_NAME_LENGTH)
    if (!nameResult.ok) return nameResult
    updates.name = nameResult.value
  }

  if (raw.short_bio !== null && raw.short_bio !== undefined) {
    const value = trimString(raw.short_bio, MAX_PERSONA_SHORT_BIO_LENGTH)
    updates.short_bio = value || null
    lengthChecks.push({
      label: 'Short bio',
      value,
      max: MAX_PERSONA_SHORT_BIO_LENGTH,
    })
  }

  if (raw.appearance !== null && raw.appearance !== undefined) {
    const value = trimString(raw.appearance, MAX_PERSONA_APPEARANCE_LENGTH)
    updates.appearance = value || null
    lengthChecks.push({
      label: 'Appearance',
      value,
      max: MAX_PERSONA_APPEARANCE_LENGTH,
    })
  }

  if (raw.personality !== null && raw.personality !== undefined) {
    const value = trimString(raw.personality, MAX_PERSONA_PERSONALITY_LENGTH)
    updates.personality = value || null
    lengthChecks.push({
      label: 'Personality',
      value,
      max: MAX_PERSONA_PERSONALITY_LENGTH,
    })
  }

  const lengthErr = validateMaxLength(lengthChecks)
  if (lengthErr) return lengthErr

  return { ok: true, value: updates }
}

export function validateDisplayName(value: unknown): ValidationResult<string> {
  return requireNonEmptyString(value, 'Display name', MAX_DISPLAY_NAME_LENGTH)
}

export function validateKinkPrefs(value: unknown): ValidationResult<string[]> {
  if (value == null) return { ok: true, value: [] }
  if (!Array.isArray(value)) {
    return { ok: false, error: 'kinkPrefs must be an array', status: 400 }
  }
  if (value.length > MAX_ONBOARDING_KINK_PREFS) {
    return {
      ok: false,
      error: `At most ${MAX_ONBOARDING_KINK_PREFS} preferences allowed`,
      status: 400,
    }
  }
  const prefs: string[] = []
  for (const item of value) {
    if (typeof item !== 'string') {
      return { ok: false, error: 'Each preference must be a string', status: 400 }
    }
    const pref = item.trim().slice(0, MAX_KINK_PREF_LENGTH)
    if (pref) prefs.push(pref)
  }
  return { ok: true, value: prefs }
}

export function validateReportDetails(
  reason: string,
  details: unknown
): ValidationResult<string | null> {
  const trimmed = trimString(details ?? '', MAX_REPORT_DETAILS_LENGTH)
  if (trimmed.length > MAX_REPORT_DETAILS_LENGTH) {
    return {
      ok: false,
      error: `Details must be ${MAX_REPORT_DETAILS_LENGTH} characters or less`,
      status: 400,
    }
  }
  if (reason === 'Other' && !trimmed) {
    return { ok: false, error: 'Please provide details for Other', status: 400 }
  }
  return { ok: true, value: trimmed || null }
}
