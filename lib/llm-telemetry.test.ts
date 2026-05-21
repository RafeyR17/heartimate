import { describe, expect, it, vi } from 'vitest'
import { emitLlmMetrics, usageFromOpenRouter } from '@/lib/llm-telemetry'

describe('llm telemetry', () => {
  it('maps OpenRouter usage fields', () => {
    expect(
      usageFromOpenRouter({
        prompt_tokens: 10,
        completion_tokens: 20,
        total_tokens: 30,
      })
    ).toEqual({
      promptTokens: 10,
      completionTokens: 20,
      totalTokens: 30,
    })
  })

  it('emits latency and token metrics', () => {
    const info = vi.fn()
    emitLlmMetrics({ info }, 'llm.stream_complete', {
      model: 'test/model',
      latencyMs: 1200,
      totalTokens: 42,
    })
    expect(info).toHaveBeenCalledWith(
      'llm.stream_complete',
      expect.objectContaining({ model: 'test/model', latencyMs: 1200, totalTokens: 42 })
    )
    expect(info).toHaveBeenCalledWith(
      'metric.llm.latency_ms',
      expect.objectContaining({ metric: 'llm.latency_ms', value: 1200 })
    )
    expect(info).toHaveBeenCalledWith(
      'metric.llm.tokens',
      expect.objectContaining({ metric: 'llm.tokens', value: 42 })
    )
  })
})
