/** Structured LLM completion metadata for logs and metrics. */
export type LlmCompletionMeta = {
  model: string
  latencyMs: number
  promptTokens?: number
  completionTokens?: number
  totalTokens?: number
  fallbackUsed?: boolean
  primaryModel?: string
}

export function usageFromOpenRouter(
  usage?: Record<string, number | undefined>
): Pick<LlmCompletionMeta, 'promptTokens' | 'completionTokens' | 'totalTokens'> {
  if (!usage) return {}
  return {
    promptTokens: usage.prompt_tokens,
    completionTokens: usage.completion_tokens,
    totalTokens: usage.total_tokens,
  }
}

export function emitLlmMetrics(
  log: {
    info: (event: string, fields?: Record<string, unknown>) => void
  },
  event: string,
  meta: LlmCompletionMeta
): void {
  log.info(event, {
    model: meta.model,
    latencyMs: meta.latencyMs,
    ...(meta.promptTokens != null ? { promptTokens: meta.promptTokens } : {}),
    ...(meta.completionTokens != null ? { completionTokens: meta.completionTokens } : {}),
    ...(meta.totalTokens != null ? { totalTokens: meta.totalTokens } : {}),
    ...(meta.fallbackUsed ? { fallbackUsed: true, primaryModel: meta.primaryModel } : {}),
  })
  log.info('metric.llm.latency_ms', {
    metric: 'llm.latency_ms',
    value: meta.latencyMs,
    model: meta.model,
    event,
  })
  if (meta.totalTokens != null) {
    log.info('metric.llm.tokens', {
      metric: 'llm.tokens',
      value: meta.totalTokens,
      model: meta.model,
      event,
    })
  }
}
