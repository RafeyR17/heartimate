/** PostHog init is deferred in components/PostHogDeferred.tsx (after idle / interaction). */

export function register() {
  // no-op — avoids eager posthog-js on first paint
}
