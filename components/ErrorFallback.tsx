'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { captureClientException } from '@/lib/posthog-browser'

export type ErrorFallbackProps = {
  error: Error & { digest?: string }
  reset: () => void
  homeHref?: string
  /** Show Next.js error digest in production for support tickets. */
  showDigest?: boolean
}

export function shouldShowErrorDigest(
  showDigest: boolean | undefined = process.env.NODE_ENV === 'production'
): boolean {
  return showDigest === true
}

export function ErrorFallback({
  error,
  reset,
  homeHref = '/',
  showDigest,
}: ErrorFallbackProps) {
  const displayDigest = shouldShowErrorDigest(showDigest)
  useEffect(() => {
    console.error(error)
    void captureClientException(error, {
      digest: error.digest,
      boundary: 'ErrorFallback',
    })
  }, [error])

  const devMessage =
    process.env.NODE_ENV === 'development' && error.message ? error.message : null

  return (
    <div className="min-h-[100dvh] bg-[#080608] flex flex-col items-center justify-center px-6 py-12 text-center font-body">
      <p className="font-heading italic text-3xl sm:text-4xl text-[#e8507a] mb-2">
        Heartimate<span className="text-[#e8507a]">.</span>
      </p>
      <h1 className="text-xl sm:text-2xl font-semibold text-white mb-2">Something went wrong</h1>
      <p className="text-sm text-white/50 max-w-md leading-relaxed mb-2">
        We hit an unexpected error. You can try again, or return home.
      </p>
      {displayDigest && error.digest ? (
        <p className="text-xs text-white/35 font-mono mb-4" role="status">
          Error ID: {error.digest}
        </p>
      ) : (
        <div className="mb-4" />
      )}
      {devMessage ? (
        <pre className="text-left text-[11px] text-[#e8507a]/90 bg-white/[0.04] border border-white/10 rounded-xl p-3 mb-6 max-w-md w-full overflow-auto max-h-32">
          {devMessage}
        </pre>
      ) : null}
      <div className="flex flex-wrap gap-3 justify-center">
        <button
          type="button"
          onClick={reset}
          className="min-h-[44px] px-7 rounded-full bg-[#e8507a] text-white text-sm font-semibold uppercase tracking-wider hover:opacity-90 transition-opacity"
        >
          Try again
        </button>
        <Link
          href={homeHref}
          className="min-h-[44px] inline-flex items-center px-7 rounded-full border border-white/15 text-white/70 text-sm font-medium uppercase tracking-wider hover:text-white hover:border-white/25 transition-colors"
        >
          Go home
        </Link>
      </div>
    </div>
  )
}
