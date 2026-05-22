import { withAuthedApi, type AppRouteCtx } from '@/lib/with-authed-api'
import { assertApiRateLimit } from '@/lib/api-rate-limits'
import { API_ERROR_CODES } from '@/lib/api-error-codes'
import { API_NOT_FOUND } from '@/lib/api-route-codes'
import { routeFailure } from '@/lib/observability/route-error'
import { apiError, apiSuccess } from '@/lib/api'
import { validatePersonaPatchFields } from '@/lib/api-validation'
import { runApiHandler } from '@/lib/observability/api-route'
import { uploadPreparedAvatar } from '@/lib/avatar-storage'
import { processAvatarUpload } from '@/lib/upload'
import type { SupabaseClient } from '@supabase/supabase-js'

async function getOwnedPersona(
  supabase: SupabaseClient,
  personaId: string,
  userId: string
) {
  const { data, error } = await supabase
    .from('personas')
    .select('*')
    .eq('id', personaId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error
  return data
}

export const GET = withAuthedApi<AppRouteCtx<{ id: string }>>(async (authed, req, routeCtx) => {
  if (!routeCtx?.params) return apiError('Bad request', 400)
  const { id } = await routeCtx.params
  return runApiHandler('GET /api/personas/:id', req, async ({ log, setUserId }) => {
    const { supabase, user } = authed
    setUserId(user.id)

    try {
      const persona = await getOwnedPersona(supabase, id, user.id)
      if (!persona) {
        return apiError('Persona not found', 404, API_NOT_FOUND.persona)
      }

      return apiSuccess({ persona })
    } catch (err) {
      return routeFailure(log, 'personas.get_failed', err, { personaId: id }, {
        message: 'Failed to fetch persona',
        status: 500,
        code: API_ERROR_CODES.INTERNAL_ERROR,
      })
    }
  })
})

export const PATCH = withAuthedApi<AppRouteCtx<{ id: string }>>(async (authed, req, routeCtx) => {
  if (!routeCtx?.params) return apiError('Bad request', 400)
  const { id } = await routeCtx.params
  return runApiHandler('PATCH /api/personas/:id', req, async ({ req: request, log, setUserId }) => {
    const { supabase, user } = authed
    setUserId(user.id)

    const rateLimited = await assertApiRateLimit(user.id, 'persona_update')
    if (rateLimited) return rateLimited

    try {
      const formData = await request.formData()

      const validated = validatePersonaPatchFields({
        name: formData.has('name') ? formData.get('name') : null,
        short_bio: formData.has('short_bio') ? formData.get('short_bio') : null,
        appearance: formData.has('appearance') ? formData.get('appearance') : null,
        personality: formData.has('personality') ? formData.get('personality') : null,
      })
      if (!validated.ok) {
        return apiError(validated.error, validated.status ?? 400)
      }

      const existing = await getOwnedPersona(supabase, id, user.id)
      if (!existing) {
        return apiError('Persona not found', 404, API_NOT_FOUND.persona)
      }

      const avatarFile = formData.get('avatar') as File | null
      const existingAvatarUrl = formData.get('avatarUrl') as string | null
      const removeAvatar = formData.get('removeAvatar') === 'true'

      const updates: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
        ...validated.value,
      }

      if (removeAvatar) {
        updates.avatar_url = null
      } else if (avatarFile && avatarFile.size > 0) {
        const uploadLimited = await assertApiRateLimit(user.id, 'avatar_upload')
        if (uploadLimited) return uploadLimited

        const prepared = await processAvatarUpload(avatarFile, { namePrefix: 'persona' })
        if (!prepared.ok) {
          return apiError(prepared.error, 400)
        }

        const uploaded = await uploadPreparedAvatar(
          prepared.fileName,
          prepared.buffer,
          prepared.contentType
        )
        if (!uploaded.ok) {
          log.error('personas.upload_failed', { error: uploaded.error })
          return apiError('Failed to upload avatar', 500)
        }
        updates.avatar_url = uploaded.publicUrl
      } else if (existingAvatarUrl) {
        updates.avatar_url = existingAvatarUrl
      }

      const { data, error } = await supabase
        .from('personas')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) throw error

      log.info('personas.updated', { personaId: id })
      return apiSuccess({ persona: data })
    } catch (err) {
      return routeFailure(log, 'personas.patch_failed', err, { personaId: id }, {
        message: 'Failed to update persona',
        status: 500,
        code: API_ERROR_CODES.INTERNAL_ERROR,
      })
    }
  })
})

export const DELETE = withAuthedApi<AppRouteCtx<{ id: string }>>(async (authed, req, routeCtx) => {
  if (!routeCtx?.params) return apiError('Bad request', 400)
  const { id } = await routeCtx.params
  return runApiHandler('DELETE /api/personas/:id', req, async ({ log, setUserId }) => {
    const { supabase, user } = authed
    setUserId(user.id)

    const rateLimited = await assertApiRateLimit(user.id, 'persona_delete')
    if (rateLimited) return rateLimited

    try {
      const existing = await getOwnedPersona(supabase, id, user.id)
      if (!existing) {
        return apiError('Persona not found', 404, API_NOT_FOUND.persona)
      }

      const { error } = await supabase
        .from('personas')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)

      if (error) throw error

      log.info('personas.deleted', { personaId: id })
      return apiSuccess({})
    } catch (err) {
      return routeFailure(log, 'personas.delete_failed', err, { personaId: id }, {
        message: 'Failed to delete persona',
        status: 500,
        code: API_ERROR_CODES.INTERNAL_ERROR,
      })
    }
  })
})
