'use client'

/** Browser-only image preload for Pollinations URLs. */
export function verifyImageLoads(
  url: string,
  timeoutMs = 30_000
): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image()
    const timeout = setTimeout(() => resolve(false), timeoutMs)
    img.onload = () => {
      clearTimeout(timeout)
      resolve(true)
    }
    img.onerror = () => {
      clearTimeout(timeout)
      resolve(false)
    }
    img.src = url
  })
}
