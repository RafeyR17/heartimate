import { withAuthedApi } from '@/lib/with-authed-api'
import { assertApiRateLimit } from '@/lib/api-rate-limits'
import { apiError, apiSuccess } from '@/lib/api'
import { validatePersonaFormInput } from '@/lib/api-validation'
import { runApiHandler } from '@/lib/observability/api-route'
import { processAvatarUpload } from '@/lib/upload'
import { avatarStorageUploadOptions } from '@/lib/storage-upload'

export const GET = withAuthedApi(async (authed, req: Request) => {
  return runApiHandler('GET /api/personas', req, async ({ log, setUserId }) => {
    const { supabase, user } = authed
    setUserId(user.id)

    const { data, error } = await supabase
      .from('personas')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })

    if (error) {
      log.error('personas.list_failed', { error: error.message })
      return apiError('Failed to fetch personas', 500)
    }

    return apiSuccess({ personas: data ?? [] })
  })
})

export const POST = withAuthedApi(async (authed, req: Request) => {
  return runApiHandler('POST /api/personas', req, async ({ req, log, setUserId }) => {
    const { supabase, user } = authed
    setUserId(user.id)

    const rateLimited = await assertApiRateLimit(user.id, 'persona_create')
    if (rateLimited) return rateLimited

    const formData = await req.formData()

    const validated = validatePersonaFormInput({
      name: formData.get('name'),
      short_bio: formData.get('short_bio'),
      appearance: formData.get('appearance'),
      personality: formData.get('personality'),
    })
    if (!validated.ok) {
      return apiError(validated.error, validated.status ?? 400)
    }

    const { name, short_bio, appearance, personality } = validated.value
    const avatarFile = formData.get('avatar') as File | null
    const existingAvatarUrl = (formData.get('avatarUrl') as string) || ''

    let avatar_url: string | null = existingAvatarUrl || null

    if (avatarFile && avatarFile.size > 0) {
      const uploadLimited = await assertApiRateLimit(user.id, 'avatar_upload')
      if (uploadLimited) return uploadLimited

      const prepared = await processAvatarUpload(avatarFile, { namePrefix: 'persona' })
      if (!prepared.ok) {
        return apiError(prepared.error, 400)
      }

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(prepared.fileName, prepared.buffer, avatarStorageUploadOptions(prepared.contentType))

      if (uploadError) {
        log.error('personas.upload_failed', { error: uploadError.message })
        return apiError('Failed to upload avatar', 500)
      }

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(prepared.fileName)
      avatar_url = urlData.publicUrl
    }

    const { data, error } = await supabase
      .from('personas')
      .insert({
        user_id: user.id,
        name,
        short_bio,
        appearance,
        personality,
        avatar_url,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      log.error('personas.create_failed', { error: error.message })
      return apiError('Failed to create persona', 500)
    }

    log.info('personas.created', { personaId: data?.id })
    return apiSuccess({ persona: data })
  })
})
