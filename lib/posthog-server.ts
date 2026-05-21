import { PostHog } from 'posthog-node'

const posthogClient = new PostHog(
  process.env.NEXT_PUBLIC_POSTHOG_KEY!,
  {
    host: 'https://app.posthog.com',
    flushAt: 1,
    flushInterval: 0,
  }
)

export function getPostHogClient() {
  return posthogClient
}

export default posthogClient
