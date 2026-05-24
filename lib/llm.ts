import { trimMessagesForLLM } from '@/lib/llm-context'
import { usageFromOpenRouter, type LlmCompletionMeta } from '@/lib/llm-telemetry'
import { serverLog } from '@/lib/server-log'

export const OPENROUTER_CHAT_URL =
  'https://openrouter.ai/api/v1/chat/completions'

export const OPENROUTER_MODEL_DEFAULT = 'deepseek/deepseek-chat'

/** @deprecated Use resolveChatGenerationParams; kept for docs/imports. */
export const OPENROUTER_MAX_TOKENS = 1000

const STREAM_TIMEOUT_MS = 120_000

const GEN_DEFAULTS = {
  sfw: {
    max_tokens: 1000,
    temperature: 0.85,
    presence_penalty: 0.6,
    frequency_penalty: 0.3,
  },
  nsfw: {
    max_tokens: 1350,
    temperature: 0.92,
    presence_penalty: 0.6,
    frequency_penalty: 0.2,
  },
} as const

export type OpenRouterGenerationParams = {
  max_tokens: number
  temperature: number
  presence_penalty: number
  frequency_penalty: number
}

function envTrim(key: string): string | undefined {
  const v = process.env[key]?.trim()
  return v || undefined
}

function envInt(key: string): number | undefined {
  const raw = envTrim(key)
  if (!raw) return undefined
  const n = parseInt(raw, 10)
  return Number.isFinite(n) && n > 0 ? n : undefined
}

function envFloat(key: string): number | undefined {
  const raw = envTrim(key)
  if (!raw) return undefined
  const n = parseFloat(raw)
  return Number.isFinite(n) ? n : undefined
}

export function resolveChatModel(isNsfw: boolean): string {
  return resolveChatModelCandidates(isNsfw)[0]!
}

/** Primary slug first, then comma-separated OPENROUTER_MODEL_FALLBACK list. */
export function resolveChatModelCandidates(isNsfw: boolean): string[] {
  const primary =
    isNsfw && envTrim('OPENROUTER_MODEL_NSFW')
      ? envTrim('OPENROUTER_MODEL_NSFW')!
      : (envTrim('OPENROUTER_MODEL') ?? OPENROUTER_MODEL_DEFAULT)
  const fallbacks = (envTrim('OPENROUTER_MODEL_FALLBACK') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  return [...new Set([primary, ...fallbacks])]
}

export function resolveMemoryModel(): string {
  return envTrim('OPENROUTER_MEMORY_MODEL') ?? OPENROUTER_MODEL_DEFAULT
}

export function resolveChatGenerationParams(
  isNsfw: boolean
): OpenRouterGenerationParams {
  const base = isNsfw ? GEN_DEFAULTS.nsfw : GEN_DEFAULTS.sfw
  const suffix = isNsfw ? '_NSFW' : '_SFW'

  const globalMax = isNsfw ? undefined : envInt('OPENROUTER_MAX_TOKENS')
  const globalTemp = isNsfw ? undefined : envFloat('OPENROUTER_TEMPERATURE')
  const globalFreq = isNsfw ? undefined : envFloat('OPENROUTER_FREQUENCY_PENALTY')

  return {
    max_tokens:
      envInt(`OPENROUTER_MAX_TOKENS${suffix}`) ?? globalMax ?? base.max_tokens,
    temperature:
      envFloat(`OPENROUTER_TEMPERATURE${suffix}`) ??
      globalTemp ??
      base.temperature,
    presence_penalty:
      envFloat(`OPENROUTER_PRESENCE_PENALTY${suffix}`) ??
      envFloat('OPENROUTER_PRESENCE_PENALTY') ??
      base.presence_penalty,
    frequency_penalty:
      envFloat(`OPENROUTER_FREQUENCY_PENALTY${suffix}`) ??
      globalFreq ??
      base.frequency_penalty,
  }
}

export type OpenRouterHeaderOptions = {
  /** When false, never substitute OPENROUTER_API_KEY if the passed key is empty. */
  allowEnvFallback?: boolean
}

export function openRouterRequestHeaders(
  apiKey?: string,
  options?: OpenRouterHeaderOptions
): Record<string, string> {
  const allowEnvFallback = options?.allowEnvFallback ?? true
  const trimmed = apiKey?.trim()
  const key =
    trimmed ||
    (allowEnvFallback ? process.env.OPENROUTER_API_KEY?.trim() : undefined)
  if (!key) {
    throw new Error(
      allowEnvFallback
        ? 'OPENROUTER_API_KEY is not configured'
        : 'OpenRouter API key is required'
    )
  }
  return {
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    'X-Title': 'Heartimate',
  }
}

export function openAiRequestHeaders(apiKey: string): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  }
}

export function resolveChatCompletionsRequest(
  options?: Pick<StreamChatOptions, 'apiKey' | 'provider'>
): { url: string; headers: Record<string, string> } {
  const provider = options?.provider ?? 'openrouter'
  if (provider === 'openai') {
    const key = options?.apiKey?.trim()
    if (!key) throw new Error('OpenAI API key is required')
    return {
      url: 'https://api.openai.com/v1/chat/completions',
      headers: openAiRequestHeaders(key),
    }
  }
  const explicitKey = options?.apiKey !== undefined
  return {
    url: OPENROUTER_CHAT_URL,
    headers: openRouterRequestHeaders(options?.apiKey, {
      allowEnvFallback: !explicitKey,
    }),
  }
}

/** Merges client disconnect with a hard cap on hung OpenRouter streams. */
export function mergeChatAbortSignal(
  clientSignal?: AbortSignal | null
): AbortSignal {
  const timeout = AbortSignal.timeout(STREAM_TIMEOUT_MS)
  if (!clientSignal) return timeout
  return AbortSignal.any([clientSignal, timeout])
}

export type LlmProvider = 'openrouter' | 'openai'

export type StreamChatOptions = {
  model?: string
  signal?: AbortSignal
  isNsfw?: boolean
  /** Override app OpenRouter key (BYOK). */
  apiKey?: string
  provider?: LlmProvider
  /** Called when the stream ends (success or client abort after partial read). */
  onComplete?: (meta: LlmCompletionMeta) => void
}

export type OpenRouterChatRequestBody = {
  model: string
  messages: Array<{ role: string; content: string }>
  stream: true
  max_tokens: number
  temperature: number
  presence_penalty: number
  frequency_penalty: number
}

/** Canonical POST body for chat completions (used by streamChat and contract tests). */
export function buildOpenRouterChatRequestBody(
  messages: Array<{ role: string; content: string }>,
  systemPrompt: string,
  options?: Pick<StreamChatOptions, 'model' | 'isNsfw'>
): OpenRouterChatRequestBody {
  const isNsfw = options?.isNsfw ?? false
  const trimmed = trimMessagesForLLM(messages)
  const generation = resolveChatGenerationParams(isNsfw)
  return {
    model: options?.model ?? resolveChatModel(isNsfw),
    messages: [{ role: 'system', content: systemPrompt }, ...trimmed],
    stream: true,
    max_tokens: generation.max_tokens,
    temperature: generation.temperature,
    presence_penalty: generation.presence_penalty,
    frequency_penalty: generation.frequency_penalty,
  }
}

/** Stable comparison of request shape (ignores system prompt text deltas). */
export function openRouterChatPayloadShape(
  body: OpenRouterChatRequestBody
): Record<string, unknown> {
  return {
    model: body.model,
    stream: body.stream,
    max_tokens: body.max_tokens,
    temperature: body.temperature,
    presence_penalty: body.presence_penalty,
    frequency_penalty: body.frequency_penalty,
    messageCount: body.messages.length,
    roles: body.messages.map((m) => m.role),
    lastRole: body.messages[body.messages.length - 1]?.role,
  }
}

export type StreamChatRuntimeOptions = {
  signal?: AbortSignal
  isNsfw?: boolean
  onComplete?: (meta: LlmCompletionMeta) => void
}

/**
 * Streams chat completions (OpenRouter or OpenAI BYOK).
 * `apiKey` and `provider` are passed from {@link getUserApiKey} on the chat route.
 */
export async function streamChat(
  messages: Array<{ role: string; content: string }>,
  systemPrompt: string,
  model?: string,
  apiKey?: string,
  provider?: string,
  runtime?: StreamChatRuntimeOptions
): Promise<ReadableStream<Uint8Array>> {
  const resolvedProvider = provider === 'openai' ? 'openai' : 'openrouter'
  const key = apiKey?.trim() || process.env.OPENROUTER_API_KEY?.trim()
  if (!key) {
    throw new Error('OPENROUTER_API_KEY is not configured')
  }

  const baseUrl =
    resolvedProvider === 'openai'
      ? 'https://api.openai.com/v1'
      : 'https://openrouter.ai/api/v1'

  const isNsfw = runtime?.isNsfw ?? false
  const finalModel =
    resolvedProvider === 'openai'
      ? 'gpt-4o-mini'
      : (model ?? resolveChatModel(isNsfw))

  const generation = resolveChatGenerationParams(isNsfw)
  const trimmed = trimMessagesForLLM(messages)

  const headers: Record<string, string> = {
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  }
  if (resolvedProvider === 'openrouter') {
    headers['HTTP-Referer'] =
      process.env.NEXT_PUBLIC_APP_URL || 'https://heartimate.vercel.app'
    headers['X-Title'] = 'Heartimate'
  }

  serverLog.info('llm', 'streamChat request', {
    baseUrl,
    provider: resolvedProvider,
    model: finalModel,
    keyPrefix: key.slice(0, 10),
  })

  const startedAt = Date.now()
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: finalModel,
      messages: [{ role: 'system', content: systemPrompt }, ...trimmed],
      stream: true,
      max_tokens: generation.max_tokens,
      temperature: generation.temperature,
      ...(resolvedProvider === 'openrouter'
        ? {
            presence_penalty: generation.presence_penalty,
            frequency_penalty: generation.frequency_penalty,
          }
        : {}),
    }),
    signal: runtime?.signal,
  })

  if (!response.ok) {
    const err = await response.text()
    serverLog.error('llm', 'streamChat failed', {
      status: response.status,
      body: err.slice(0, 500),
    })
    throw new Error(`LLM failed: ${response.status}`)
  }

  if (!response.body) {
    throw new Error('No response body')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let lastUsage: Record<string, number> | undefined

  return new ReadableStream({
    async start(controller) {
      let buffer = ''
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''

          for (const line of lines) {
            const closed = processSseLine(line, controller, (usage) => {
              lastUsage = usage
            })
            if (closed) {
              finishLlmStream(runtime, {
                model: finalModel,
                latencyMs: Date.now() - startedAt,
                ...usageFromOpenRouter(lastUsage),
                fallbackUsed: false,
                primaryModel: finalModel,
              })
              return
            }
          }
        }

        if (buffer.trim()) {
          processSseLine(buffer, controller, (usage) => {
            lastUsage = usage
          })
        }
        finishLlmStream(runtime, {
          model: finalModel,
          latencyMs: Date.now() - startedAt,
          ...usageFromOpenRouter(lastUsage),
          fallbackUsed: false,
          primaryModel: finalModel,
        })
        controller.close()
      } catch (err) {
        if (runtime?.signal?.aborted) {
          finishLlmStream(runtime, {
            model: finalModel,
            latencyMs: Date.now() - startedAt,
            ...usageFromOpenRouter(lastUsage),
            fallbackUsed: false,
            primaryModel: finalModel,
          })
          controller.close()
          return
        }
        controller.error(err)
      }
    },
    cancel() {
      reader.cancel()
    },
  })
}

function finishLlmStream(
  runtime: StreamChatRuntimeOptions | undefined,
  meta: LlmCompletionMeta
): void {
  try {
    runtime?.onComplete?.(meta)
  } catch {
    // Telemetry must not break the stream.
  }
}

function processSseLine(
  line: string,
  controller: ReadableStreamDefaultController<Uint8Array>,
  onUsage?: (usage: Record<string, number>) => void
): boolean {
  const trimmed = line.trim()
  if (!trimmed || !trimmed.startsWith('data: ')) return false

  const data = trimmed.slice(6)
  if (data === '[DONE]') {
    controller.close()
    return true
  }

  try {
    const parsed = JSON.parse(data) as {
      choices?: Array<{ delta?: { content?: string } }>
      usage?: Record<string, number>
    }
    if (parsed.usage) onUsage?.(parsed.usage)
    const content = parsed.choices?.[0]?.delta?.content
    if (content) {
      controller.enqueue(new TextEncoder().encode(content))
    }
  } catch {
    // Incomplete or malformed line; skip until buffer completes a line.
  }
  return false
}
