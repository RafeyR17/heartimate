'use client'

import { ClerkProvider } from '@clerk/nextjs'
import { PostHogIdentify } from '@/components/PostHogIdentify'

/** Clerk JS only on routes that need auth UI (not public catalog / landing). */
export function ClerkProviders({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      signInUrl="/login"
      signUpUrl="/signup"
      signInFallbackRedirectUrl="/home"
      signUpFallbackRedirectUrl="/onboarding"
    >
      <PostHogIdentify />
      {children}
    </ClerkProvider>
  )
}
