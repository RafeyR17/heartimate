'use client'

import { useUser } from '@clerk/nextjs'
import { useEffect } from 'react'
import { identifyPostHog, resetPostHog } from '@/lib/posthog-browser'

export function PostHogIdentify() {
  const { user, isLoaded } = useUser()

  useEffect(() => {
    if (!isLoaded) return
    if (user) {
      void identifyPostHog(user.id, {
        email: user.emailAddresses[0]?.emailAddress,
        name: user.fullName ?? undefined,
        created_at: user.createdAt,
      })
    } else {
      void resetPostHog()
    }
  }, [user, isLoaded])

  return null
}
