import { withAuthedApi, type AppRouteCtx } from '@/lib/with-authed-api'
import { assertApiRateLimit } from '@/lib/api-rate-limits'
import { revalidateExploreCatalog } from '@/lib/cache-tags'
import { API_ERROR_CODES } from '@/lib/api-error-codes'
import { API_NOT_FOUND } from '@/lib/api-route-codes'
import { routeFailure } from '@/lib/observability/route-error'
import { apiError, apiSuccess } from '@/lib/api'
import { validateCharacterFormInput } from '@/lib/api-validation'
import { runApiHandler } from '@/lib/observability/api-route'
import { uploadPreparedAvatar } from '@/lib/avatar-storage'
import { processAvatarUpload } from '@/lib/upload'
import type { SupabaseClient } from '@supabase/supabase-js'

async function getOwnedCharacter(
  supabase: SupabaseClient,
  characterId: string,
  userId: string
) {
  const { data, error } = await supabase
    .from('characters')
    .select('*')
    .eq('id', characterId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error
  return data
}

export const PATCH = withAuthedApi<AppRouteCtx<{ id: string }>>(async (authed, req, routeCtx) => {
  if (!routeCtx?.params) return apiError('Bad request', 400)
  const { id } = await routeCtx.params
  return runApiHandler('PATCH /api/characters/:id', req, async ({ req: request, log, setUserId }) => {
    const { supabase, user } = authed
    setUserId(user.id)

    const rateLimited = await assertApiRateLimit(user.id, 'character_update')
    if (rateLimited) return rateLimited

    const existing = await getOwnedCharacter(supabase, id, user.id)
    if (!existing) {
      return apiError('Character not found', 404, API_NOT_FOUND.character)
    }

    const contentType = request.headers.get('content-type') || ''

    try {
    if (contentType.includes('multipart/form-data')) {
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
      const keepAvatarUrl = (formData.get('keepAvatarUrl') as string) || ''
      const avatarFile = formData.get('avatar') as File | null

      let avatarUrl: string | null = (existing.avatar_url as string | null) ?? null

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
      } else if (keepAvatarUrl.startsWith('http')) {
        avatarUrl = keepAvatarUrl
      }

      const { data, error } = await supabase
        .from('characters')
        .update({
          name,
          description,
          personality,
          scenario,
          greeting,
          example_dialogs: exampleDialogs,
          tags,
          is_nsfw: isNsfw,
          is_public: isPublic,
          avatar_url: avatarUrl,
        })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) throw error
      if (isPublic || existing.is_public) {
        revalidateExploreCatalog(id)
      }
      return apiSuccess({ character: data })
    }

    let body: { isPublic?: unknown }
    try {
      body = await request.json()
    } catch {
      return apiError('Invalid JSON body', 400)
    }

    const keys = Object.keys(body)
    if (
      keys.length === 1 &&
      keys[0] === 'isPublic' &&
      typeof body.isPublic === 'boolean'
    ) {
      const { data, error } = await supabase
        .from('characters')
        .update({ is_public: Boolean(body.isPublic) })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) throw error
      if (body.isPublic || existing.is_public) {
        revalidateExploreCatalog(id)
      }
      return apiSuccess({ character: data })
    }

    return apiError('Unsupported JSON body', 400)
    } catch (err) {
      return routeFailure(log, 'characters.patch_failed', err, { characterId: id }, {
        message: 'Failed to update character',
        status: 500,
        code: API_ERROR_CODES.INTERNAL_ERROR,
      })
    }
  })
})

export const DELETE = withAuthedApi<AppRouteCtx<{ id: string }>>(async (authed, req, routeCtx) => {
  if (!routeCtx?.params) return apiError('Bad request', 400)
  const { id } = await routeCtx.params
  return runApiHandler('DELETE /api/characters/:id', req, async ({ log, setUserId }) => {
    const { supabase, user } = authed
    setUserId(user.id)

    const rateLimited = await assertApiRateLimit(user.id, 'character_delete')
    if (rateLimited) return rateLimited

    try {
      const existing = await getOwnedCharacter(supabase, id, user.id)
      if (!existing) {
        return apiError('Character not found', 404, API_NOT_FOUND.character)
      }

      const { error } = await supabase
        .from('characters')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)

      if (error) throw error

      log.info('characters.deleted', { characterId: id })
      if (existing.is_public) {
        revalidateExploreCatalog(id)
      }
      return apiSuccess({})
    } catch (err) {
      return routeFailure(log, 'characters.delete_failed', err, { characterId: id }, {
        message: 'Failed to delete character',
        status: 500,
        code: API_ERROR_CODES.INTERNAL_ERROR,
      })
    }
  })
})
