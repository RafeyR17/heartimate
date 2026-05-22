import { withAuthedApi } from '@/lib/with-authed-api'
import { assertApiRateLimit } from '@/lib/api-rate-limits'
import { revalidateExploreCatalog } from '@/lib/cache-tags'
import { apiError, apiSuccess } from '@/lib/api'
import { validateCharacterFormInput } from '@/lib/api-validation'
import { runApiHandler } from '@/lib/observability/api-route'
import { uploadPreparedAvatar } from '@/lib/avatar-storage'
import { processAvatarUpload } from '@/lib/upload'

export const POST = withAuthedApi(async (authed, req: Request) => {
  return runApiHandler('POST /api/characters', req, async ({ req: request, log, setUserId }) => {
    const { supabase, user } = authed
    setUserId(user.id)

    const rateLimited = await assertApiRateLimit(user.id, 'character_create')
    if (rateLimited) return rateLimited

    const formData = await request.formData()

    const validated = validateCharacterFormInput({
      name: formData.get('name'),
      description: formData.get('description'),
      personality: formData.get('personality'),
      scenario: formData.get('scenario'),
      greeting: formData.get('greeting'),
      exampleDialogs: formData.get('exampleDialogs'),
      tagsRaw: formData.get('tags'),
    })
    if (!validated.ok) {
      return apiError(validated.error, validated.status ?? 400)
    }

    const {
      name,
      description,
      personality,
      scenario,
      greeting,
      exampleDialogs,
      tags,
    } = validated.value

    const isNsfw = formData.get('isNsfw') === 'true'
    const isPublic = formData.get('isPublic') === 'true'
    const forkedFromId = (formData.get('forkedFromId') as string) || null
    const avatarUrlFromFork = (formData.get('avatarUrl') as string) || ''
    const avatarFile = formData.get('avatar') as File | null

    let avatarUrl = avatarUrlFromFork

    if (avatarFile && avatarFile.size > 0) {
      const uploadLimited = await assertApiRateLimit(user.id, 'avatar_upload')
      if (uploadLimited) return uploadLimited

      const prepared = await processAvatarUpload(avatarFile)
      if (!prepared.ok) {
        return apiError(prepared.error, 400)
      }

      const uploaded = await uploadPreparedAvatar(
        prepared.fileName,
        prepared.buffer,
        prepared.contentType
      )
      if (!uploaded.ok) {
        log.error('characters.upload_failed', { error: uploaded.error })
        return apiError('Failed to upload avatar', 500)
      }
      avatarUrl = uploaded.publicUrl
    }

    const insertRow: Record<string, unknown> = {
      user_id: user.id,
      name,
      avatar_url: avatarUrl || null,
      description,
      personality,
      scenario,
      greeting,
      example_dialogs: exampleDialogs,
      tags,
      is_nsfw: isNsfw,
      is_public: isPublic,
    }

    if (forkedFromId) {
      const { data: forkSource } = await supabase
        .from('characters')
        .select('id, name')
        .eq('id', forkedFromId)
        .maybeSingle()

      if (!forkSource) {
        return apiError('Invalid fork source', 400)
      }
      insertRow.forked_from_id = forkSource.id
      insertRow.forked_from_name = forkSource.name
    }

    const { data: character, error: charError } = await supabase
      .from('characters')
      .insert(insertRow)
      .select()
      .single()

    if (charError) {
      log.error('characters.insert_failed', { error: charError.message })
      return apiError('Failed to save character to database', 500)
    }

    log.info('characters.created', { characterId: character.id })
    if (isPublic) {
      revalidateExploreCatalog(character.id)
    }
    return apiSuccess({ id: character.id })
  })
})
