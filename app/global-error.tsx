'use client'

import { ErrorFallback } from '@/components/ErrorFallback'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body className="m-0 bg-[#080608] text-white antialiased">
        <ErrorFallback error={error} reset={reset} homeHref="/" />
      </body>
    </html>
  )
}
