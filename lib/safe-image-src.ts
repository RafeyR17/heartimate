const DEFAULT_CHARACTER_AVATAR = '/images/characters/lyra.jpg'

const ALLOWED_REMOTE_HOST_SUFFIXES = [
  '.supabase.co',
  '.supabase.in',
  'img.clerk.com',
  'images.clerk.dev',
  'image.pollinations.ai',
]

function isLocalImageSrc(src: string): boolean {
  return src.startsWith('/') && !src.startsWith('//')
}

function isAllowedRemoteImageSrc(src: string): boolean {
  try {
    const url = new URL(src)
    if (url.protocol !== 'https:') return false
    const host = url.hostname.toLowerCase()
    return ALLOWED_REMOTE_HOST_SUFFIXES.some(
      (suffix) => host === suffix.slice(1) || host.endsWith(suffix)
    )
  } catch {
    return false
  }
}

/**
 * Next.js <Image> throws on unknown remote hosts in production.
 * Fall back to a local placeholder when avatar URLs are missing or unsupported.
 */
export function resolveCharacterImageSrc(
  avatarUrl: string | null | undefined,
  fallback = DEFAULT_CHARACTER_AVATAR
): string {
  const trimmed = avatarUrl?.trim()
  if (!trimmed) return fallback
  if (isLocalImageSrc(trimmed)) return trimmed
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) return trimmed
  if (isAllowedRemoteImageSrc(trimmed)) return trimmed
  return fallback
}

export { DEFAULT_CHARACTER_AVATAR }
