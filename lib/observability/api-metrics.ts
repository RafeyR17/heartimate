import type { ApiLogger } from '@/lib/observability/api-logger'

/** Lightweight metrics via structured logs (ingest to Datadog/PostHog/etc. from `event: metric.*`). */
export function recordApiMetric(
  log: ApiLogger,
  name: string,
  value: number,
  tags?: Record<string, string | number | boolean>
): void {
  log.info(`metric.${name}`, {
    metric: name,
    value,
    ...tags,
  })
}
