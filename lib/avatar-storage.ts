import 'server-only'
import { getServiceRoleClient } from '@/lib/service-role'
import { avatarStorageUploadOptions } from '@/lib/storage-upload'
import type { AllowedImageMime } from '@/lib/upload'
import { serverLog } from '@/lib/server-log'

export type AvatarStorageUploadResult =
  | { ok: true; publicUrl: string }
  | { ok: false; error: string }

/**
 * Upload a processed avatar to the public `avatars` bucket.
 * Uses service role — storage has read-only policies for JWT clients (see 20240530 migration).
 * Call only from authenticated API routes after validating the user.
 */
export async function uploadPreparedAvatar(
  fileName: string,
  buffer: Buffer,
  contentType: AllowedImageMime,
  opts?: { upsert?: boolean }
): Promise<AvatarStorageUploadResult> {
  const admin = getServiceRoleClient()
  const { error } = await admin.storage
    .from('avatars')
    .upload(
      fileName,
      buffer,
      avatarStorageUploadOptions(contentType, { upsert: opts?.upsert })
    )

  if (error) {
    serverLog.error('avatar-storage', 'upload_failed', {
      fileName,
      message: error.message,
    })
    return { ok: false, error: error.message }
  }

  const { data } = admin.storage.from('avatars').getPublicUrl(fileName)
  return { ok: true, publicUrl: data.publicUrl }
}
