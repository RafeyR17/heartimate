'use client'

type PostHogClient = typeof import('posthog-js').default

let initPromise: Promise<PostHogClient | null> | null = null
let didInit = false

function shouldInit(): boolean {
  return (
    typeof window !== 'undefined' &&
    Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY) &&
    process.env.NODE_ENV !== 'test'
  )
}

/** Lazy init — call after load, idle, or first interaction (see PostHogDeferred). */
export function initPostHog(): Promise<PostHogClient | null> {
  if (!shouldInit()) return Promise.resolve(null)
  if (initPromise) return initPromise

  initPromise = import('posthog-js').then(({ default: posthog }) => {
    if (!didInit) {
      didInit = true
      posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
        api_host: '/ingest',
        ui_host: 'https://app.posthog.com',
        capture_pageview: 'history_change',
        capture_pageleave: true,
        loaded: (ph) => {
          if (process.env.NODE_ENV === 'development') {
            ph.debug()
          }
        },
      })
    }
    return posthog
  })

  return initPromise
}

export async function getPostHogBrowser(): Promise<PostHogClient | null> {
  return initPostHog()
}

export async function capturePostHog(
  event: string,
  properties?: Record<string, unknown>
): Promise<void> {
  const ph = await initPostHog()
  ph?.capture(event, properties)
}

export async function identifyPostHog(
  distinctId: string,
  properties?: Record<string, unknown>
): Promise<void> {
  const ph = await initPostHog()
  ph?.identify(distinctId, properties)
}

export async function resetPostHog(): Promise<void> {
  const ph = await initPostHog()
  ph?.reset()
}

/** Report client-side exceptions (error boundaries, unhandled UI errors). */
export async function captureClientException(
  error: unknown,
  context?: Record<string, unknown>
): Promise<void> {
  const ph = await initPostHog()
  if (!ph) return

  const err = error instanceof Error ? error : new Error(String(error))
  ph.capture('$exception', {
    $exception_message: err.message,
    $exception_type: err.name,
    $exception_stack_trace_raw: err.stack,
    ...context,
  })
}
