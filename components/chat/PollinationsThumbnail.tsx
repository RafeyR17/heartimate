'use client'

import { useCallback, useState } from 'react'
import { Loader2 } from 'lucide-react'

type PollinationsThumbnailProps = {
  url: string
  alt: string
  className?: string
  onLoaded?: () => void
}

const MAX_RETRIES = 5
const RETRY_DELAY_MS = 5000

function withCacheBust(url: string, attempt: number): string {
  const sep = url.includes('?') ? '&' : '?'
  return `${url}${sep}_retry=${attempt}&t=${Date.now()}`
}

/** Pollinations can take 30–90s; avoid broken <img> icons with shimmer + retries. */
export function PollinationsThumbnail({
  url,
  alt,
  className = '',
  onLoaded,
}: PollinationsThumbnailProps) {
  const [src, setSrc] = useState(url)
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)
  const [retryCount, setRetryCount] = useState(0)

  const scheduleRetry = useCallback(() => {
    if (retryCount >= MAX_RETRIES) {
      setFailed(true)
      return
    }
    const attempt = retryCount + 1
    window.setTimeout(() => {
      setSrc(withCacheBust(url, attempt))
      setRetryCount(attempt)
      setFailed(false)
      setLoaded(false)
    }, RETRY_DELAY_MS)
  }, [retryCount, url])

  const handleLoad = () => {
    setLoaded(true)
    setFailed(false)
    onLoaded?.()
  }

  const handleError = () => {
    if (!loaded) scheduleRetry()
  }

  return (
    <div className={`relative h-full w-full ${className}`}>
      {!failed && (
        // eslint-disable-next-line @next/next/no-img-element -- Pollinations CDN; slow, long timeouts
        <img
          src={src}
          alt={alt}
          className="absolute inset-0 h-full w-full object-cover"
          referrerPolicy="no-referrer"
          decoding="async"
          onLoad={handleLoad}
          onError={handleError}
        />
      )}
      {(!loaded || failed) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 chat-image-shimmer bg-[#120d14]">
          {failed ? (
            <span className="px-2 text-center text-[11px] text-white/50">
              Still loading — tap ↺ Try again
            </span>
          ) : (
            <>
              <Loader2 className="h-5 w-5 animate-spin text-[#e8507a]" />
              <span className="text-[10px] text-white/40">5–60s…</span>
            </>
          )}
        </div>
      )}
    </div>
  )
}
