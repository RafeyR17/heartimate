/** Long-cache headers for public avatar objects (Supabase CDN). */
export const AVATAR_STORAGE_CACHE_CONTROL = 'public, max-age=31536000, immutable'

export function avatarStorageUploadOptions(
  contentType: string,
  opts?: { upsert?: boolean; duplex?: 'half' }
) {
  return {
    contentType,
    cacheControl: AVATAR_STORAGE_CACHE_CONTROL,
    ...(opts?.upsert != null ? { upsert: opts.upsert } : {}),
    ...(opts?.duplex ? { duplex: opts.duplex } : {}),
  }
}
