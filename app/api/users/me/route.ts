import { withAuthedApi } from '@/lib/with-authed-api'
import { assertApiRateLimit } from '@/lib/api-rate-limits'
import { apiError, apiSuccess } from '@/lib/api'
import { parseJsonBody, usersMePatchJsonSchema } from '@/lib/api-schemas'
import { MAX_USER_BIO_LENGTH } from '@/lib/api-validation'
import { runApiHandler } from '@/lib/observability/api-route'
import { processAvatarUpload } from '@/lib/upload'
import { avatarStorageUploadOptions } from '@/lib/storage-upload'

export const GET = withAuthedApi(async (authed, req: Request) => {
  return runApiHandler('GET /api/users/me', req, async ({ log, setUserId }) => {
    const { supabase, user } = authed
    setUserId(user.id)

    const { data, error } = await supabase
      .from('users')
      .select('id, clerk_id, display_name, bio, avatar_url, is_premium, created_at')
      .eq('id', user.id)
      .single()

    if (error) {
      log.error('users.me.fetch_failed', { error: error.message })
      return apiError('Failed to fetch user', 500)
    }

    return apiSuccess({ user: data })
  })
})

export const PATCH = withAuthedApi(async (authed, req: Request) => {
  return runApiHandler('PATCH /api/users/me', req, async ({ req: request, log, setUserId }) => {
    const { supabase, user } = authed
    setUserId(user.id)

    const rateLimited = await assertApiRateLimit(user.id, 'user_update')
    if (rateLimited) return rateLimited

    const contentType = request.headers.get('content-type') ?? ''
    let displayName: string | undefined
    let bio: string | null | undefined
    let avatarUrl: string | null | undefined
    let avatarFile: File | null = null

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      const nameField = formData.get('displayName')
      const bioField = formData.get('bio')
      if (nameField !== null) displayName = String(nameField).trim()
      if (bioField !== null) bio = String(bioField).trim() || null
      avatarFile = formData.get('avatar') as File | null
      const urlField = formData.get('avatarUrl')
      if (urlField !== null) avatarUrl = String(urlField) || null
    } else {
      const bodyResult = await parseJsonBody(request, usersMePatchJsonSchema)
      if (!bodyResult.ok) return bodyResult.response
      const body = bodyResult.data
      displayName = body.displayName
      bio = body.bio
      avatarUrl = body.avatarUrl
    }

    if (bio !== undefined && bio && bio.length > MAX_USER_BIO_LENGTH) {
      return apiError(`Bio must be ${MAX_USER_BIO_LENGTH} characters or less`, 400)
    }

    const updates: Record<string, unknown> = {}
    if (displayName !== undefined) updates.display_name = displayName
    if (bio !== undefined) updates.bio = bio

    if (avatarFile && avatarFile.size > 0) {
      const uploadLimited = await assertApiRateLimit(user.id, 'avatar_upload')
      if (uploadLimited) return uploadLimited

      const prepared = await processAvatarUpload(avatarFile, { namePrefix: `user-${user.id}` })
      if (!prepared.ok) {
        return apiError(prepared.error, 400)
      }

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(
          prepared.fileName,
          prepared.buffer,
          avatarStorageUploadOptions(prepared.contentType, { upsert: true })
        )

      if (uploadError) {
        log.error('users.me.upload_failed', { error: uploadError.message })
        return apiError('Failed to upload avatar', 500)
      }

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(prepared.fileName)
      updates.avatar_url = urlData.publicUrl
    } else if (avatarUrl !== undefined) {
      if (avatarUrl) {
        try {
          const url = new URL(avatarUrl)
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
          const isSupabase = supabaseUrl && url.href.startsWith(supabaseUrl)
          const isClerk = url.hostname.endsWith('clerk.com')
          if (url.protocol !== 'https:' || (!isSupabase && !isClerk)) {
            return apiError('Invalid avatar URL domain', 400)
          }
        } catch {
          return apiError('Invalid avatar URL', 400)
        }
      }
      updates.avatar_url = avatarUrl
    }

    if (Object.keys(updates).length === 0) {
      return apiError('No fields to update', 400)
    }

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', user.id)
      .select('id, clerk_id, display_name, bio, avatar_url, is_premium, created_at')
      .single()

    if (error) {
      log.error('users.me.update_failed', { error: error.message })
      return apiError('Failed to update user', 500)
    }

    log.info('users.me.updated', { userId: user.id })
    return apiSuccess({ user: data })
  })
})
