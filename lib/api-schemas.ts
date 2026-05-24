import { z } from 'zod'
import { apiError } from '@/lib/api'
import { API_ERROR_CODES } from '@/lib/api-error-codes'
import {
  MAX_CHARACTER_DESCRIPTION_LENGTH,
  MAX_CHARACTER_GREETING_LENGTH,
  MAX_CHARACTER_NAME_LENGTH,
  MAX_CHARACTER_PERSONALITY_LENGTH,
  MAX_CHARACTER_SCENARIO_LENGTH,
  MAX_DISPLAY_NAME_LENGTH,
  MAX_KINK_PREF_LENGTH,
  MAX_ONBOARDING_KINK_PREFS,
  MAX_PERSONA_APPEARANCE_LENGTH,
  MAX_PERSONA_NAME_LENGTH,
  MAX_PERSONA_PERSONALITY_LENGTH,
  MAX_PERSONA_SHORT_BIO_LENGTH,
  MAX_REPORT_DETAILS_LENGTH,
  MAX_USER_BIO_LENGTH,
  MAX_CHAT_TITLE_LENGTH,
} from '@/lib/api-validation'
import { MAX_CHAT_MESSAGE_LENGTH } from '@/lib/chat-limits'

const idField = z.string().trim().min(1).max(64)
const trimmedString = (max: number) =>
  z.string().transform((s) => s.trim()).pipe(z.string().max(max))

export const chatsPostSchema = z.object({
  characterId: idField,
  personaId: idField.nullable().optional(),
  skipDefaultPersona: z.boolean().optional(),
})

export const chatPostSchema = z.object({
  chatId: idField,
  content: z
    .string()
    .transform((s) => s.trim())
    .pipe(z.string().min(1).max(MAX_CHAT_MESSAGE_LENGTH)),
  omitUserPersist: z.boolean().optional(),
})

export const onboardingPostSchema = z.object({
  displayName: z.string().trim().min(1).max(MAX_DISPLAY_NAME_LENGTH),
  kinkPrefs: z
    .array(z.string().trim().min(1).max(MAX_KINK_PREF_LENGTH))
    .max(MAX_ONBOARDING_KINK_PREFS)
    .optional()
    .default([]),
  personaId: idField,
  starterCharId: idField,
  characterName: z.string().trim().max(MAX_CHARACTER_NAME_LENGTH).optional(),
  isAdult: z.boolean().refine(val => val === true, "Must be 18 or older"),
})

export const REPORT_REASONS = [
  'Inappropriate content',
  'Spam / Low quality',
  'Harassment',
  'Other',
] as const

export const reportsPostSchema = z
  .object({
    characterId: idField,
    reason: z.enum(REPORT_REASONS),
    details: z.string().trim().max(MAX_REPORT_DETAILS_LENGTH).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.reason === 'Other' && !data.details?.trim()) {
      ctx.addIssue({
        code: 'custom',
        message: 'Please provide details for Other',
        path: ['details'],
      })
    }
  })

export const usersMePatchJsonSchema = z.object({
  displayName: z.string().trim().min(1).max(MAX_DISPLAY_NAME_LENGTH).optional(),
  bio: z.string().trim().max(MAX_USER_BIO_LENGTH).nullable().optional(),
  avatarUrl: z.string().max(2048).nullable().optional(),
})

export const BYOK_PROVIDERS = ['openrouter', 'openai'] as const

export const usersApiKeyPostSchema = z
  .object({
    apiKey: z.string().trim().min(8).max(512),
    provider: z.enum(BYOK_PROVIDERS),
  })
  .superRefine((data, ctx) => {
    if (data.provider === 'openrouter' && !data.apiKey.startsWith('sk-or-')) {
      ctx.addIssue({
        code: 'custom',
        message: 'Invalid OpenRouter key format. Must start with sk-or-',
        path: ['apiKey'],
      })
    }
    if (data.provider === 'openai' && !data.apiKey.startsWith('sk-')) {
      ctx.addIssue({
        code: 'custom',
        message: 'Invalid OpenAI key format',
        path: ['apiKey'],
      })
    }
  })

export const chatPatchSchema = z
  .object({
    personaId: idField.nullable().optional(),
    title: z.string().trim().min(1).max(MAX_CHAT_TITLE_LENGTH).optional(),
  })
  .refine((data) => data.personaId !== undefined || data.title !== undefined, {
    message: 'Provide personaId and/or title',
  })

export const messagePatchSchema = z.object({
  content: z
    .string()
    .transform((s) => s.trim())
    .pipe(z.string().min(1).max(MAX_CHAT_MESSAGE_LENGTH)),
  truncateAfter: z.boolean().optional(),
})

/** Multipart character create/update (field limits for Zod-backed checks). */
export const characterFormSchema = z.object({
  name: z.string().trim().min(1).max(MAX_CHARACTER_NAME_LENGTH),
  description: trimmedString(MAX_CHARACTER_DESCRIPTION_LENGTH)
    .optional()
    .default(''),
  personality: z.string().trim().min(1).max(MAX_CHARACTER_PERSONALITY_LENGTH),
  scenario: trimmedString(MAX_CHARACTER_SCENARIO_LENGTH).optional().default(''),
  greeting: z.string().trim().min(1).max(MAX_CHARACTER_GREETING_LENGTH),
  exampleDialogs: z.string().max(32_000).optional().default('[]'),
  tagsRaw: z.string().optional().default('[]'),
})

export const personaFormSchema = z.object({
  name: z.string().trim().min(1).max(MAX_PERSONA_NAME_LENGTH),
  short_bio: trimmedString(MAX_PERSONA_SHORT_BIO_LENGTH).optional().nullable(),
  appearance: trimmedString(MAX_PERSONA_APPEARANCE_LENGTH).optional().nullable(),
  personality: trimmedString(MAX_PERSONA_PERSONALITY_LENGTH).optional().nullable(),
})

export const chatImagePostSchema = z.object({
  chatId: idField,
  characterId: idField,
  userRequest: trimmedString(500).optional().nullable(),
  relationshipLevel: z.string().max(64).optional(),
  /** When set, persists assistant image message (after user picks a variation). */
  selectedImageUrl: z.string().url().max(2048).optional(),
  prompt: z.string().max(4000).optional(),
})

export const generateImagePostSchema = z.object({
  name: trimmedString(MAX_CHARACTER_NAME_LENGTH).optional(),
  description: trimmedString(MAX_CHARACTER_DESCRIPTION_LENGTH).optional(),
  personality: trimmedString(MAX_CHARACTER_PERSONALITY_LENGTH).optional(),
  tags: z.array(z.string().max(64)).max(8).optional(),
  gender: z.string().max(32).optional(),
  customPrompt: z.string().max(4000).optional(),
  variationCount: z.number().int().min(1).max(4).optional(),
  width: z.number().int().min(256).max(1024).optional(),
  height: z.number().int().min(256).max(1536).optional(),
})

export function zodValidationError(error: z.ZodError): Response {
  const issue = error.issues[0]
  const message = issue?.message ?? 'Invalid request body'
  return apiError(message, 400, { code: API_ERROR_CODES.BAD_REQUEST })
}

/** Parse and validate a JSON object against a Zod schema; returns 400 on failure. */
export function parseBody<T>(
  schema: z.ZodType<T>,
  raw: unknown
): { ok: true; data: T } | { ok: false; response: Response } {
  const result = schema.safeParse(raw)
  if (!result.success) {
    return { ok: false, response: zodValidationError(result.error) }
  }
  return { ok: true, data: result.data }
}

export async function parseJsonBody<T>(
  req: Request,
  schema: z.ZodType<T>
): Promise<{ ok: true; data: T } | { ok: false; response: Response }> {
  let json: unknown
  try {
    json = await req.json()
  } catch {
    return {
      ok: false,
      response: apiError('Invalid JSON body', 400, {
        code: API_ERROR_CODES.BAD_REQUEST,
      }),
    }
  }
  return parseBody(schema, json)
}
