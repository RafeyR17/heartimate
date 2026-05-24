import { withAuthedApi } from '@/lib/with-authed-api'
import { apiError, apiSuccess } from '@/lib/api'
import { parseJsonBody, usersApiKeyPostSchema } from '@/lib/api-schemas'
import { assertApiRateLimit } from '@/lib/api-rate-limits'
import { encryptKey } from '@/lib/encryption'
import { validateApiKey, maskApiKey, type ByokProvider } from '@/lib/byok'
import { decryptKey } from '@/lib/encryption'
import { checkQuota, FREE_DAILY_LIMIT, formatQuotaResetIn } from '@/lib/quota'
import { getServiceRoleClient } from '@/lib/service-role'
import { runApiHandler } from '@/lib/observability/api-route'

export const GET = withAuthedApi(async (authed, req: Request) => {
  return runApiHandler('GET /api/users/api-key', req, async ({ setUserId }) => {
    const { user } = authed
    setUserId(user.id)

    const quota = await checkQuota(user.id)
    const admin = getServiceRoleClient()
    const { data: row } = await admin
      .from('users')
      .select('is_byok, byok_provider, byok_key_encrypted')
      .eq('id', user.id)
      .maybeSingle()

    const provider = (row?.byok_provider as ByokProvider | null) ?? null
    const hasByok = Boolean(row?.is_byok && row?.byok_key_encrypted && provider)
    let keyPreview: string | null = null
    if (hasByok && provider && row?.byok_key_encrypted) {
      try {
        const plain = decryptKey(row.byok_key_encrypted)
        keyPreview = maskApiKey(provider, plain.slice(0, 6))
      } catch {
        keyPreview = maskApiKey(provider)
      }
    }

    return apiSuccess({
      hasByok,
      provider,
      keyPreview,
      dailyCount: quota.dailyCount,
      dailyLimit: FREE_DAILY_LIMIT,
      remaining: quota.isByok || quota.isPremium ? -1 : quota.remaining,
      resetAt: quota.resetAt,
      resetIn: formatQuotaResetIn(quota.resetAt),
      isPremium: quota.isPremium,
    })
  })
})

export const POST = withAuthedApi(async (authed, req: Request) => {
  return runApiHandler('POST /api/users/api-key', req, async ({ req: request, log, setUserId }) => {
    const { user } = authed
    setUserId(user.id)

    const rateLimited = await assertApiRateLimit(user.id, 'byok_save')
    if (rateLimited) return rateLimited

    const bodyResult = await parseJsonBody(request, usersApiKeyPostSchema)
    if (!bodyResult.ok) return bodyResult.response

    const { apiKey, provider } = bodyResult.data

    const isValid = await validateApiKey(apiKey, provider)
    if (!isValid) {
      return apiError('API key is invalid or has no credits', 400)
    }

    let encrypted: string
    try {
      encrypted = encryptKey(apiKey)
    } catch (err) {
      log.error('byok.encrypt_failed', {
        message: err instanceof Error ? err.message : String(err),
      })
      return apiError('Server encryption is not configured', 503)
    }

    const admin = getServiceRoleClient()
    const { error } = await admin
      .from('users')
      .update({
        byok_key_encrypted: encrypted,
        byok_provider: provider,
        is_byok: true,
      })
      .eq('id', user.id)

    if (error) {
      log.error('byok.save_failed', { message: error.message })
      return apiError('Failed to save API key', 500)
    }

    return apiSuccess({
      message: 'API key saved. Unlimited chats unlocked!',
    })
  })
})

export const DELETE = withAuthedApi(async (authed, req: Request) => {
  return runApiHandler('DELETE /api/users/api-key', req, async ({ log, setUserId }) => {
    const { user } = authed
    setUserId(user.id)

    const rateLimited = await assertApiRateLimit(user.id, 'byok_remove')
    if (rateLimited) return rateLimited

    const admin = getServiceRoleClient()
    const { error } = await admin
      .from('users')
      .update({
        byok_key_encrypted: null,
        byok_provider: null,
        is_byok: false,
      })
      .eq('id', user.id)

    if (error) {
      log.error('byok.remove_failed', { message: error.message })
      return apiError('Failed to remove API key', 500)
    }

    return apiSuccess({ message: 'API key removed' })
  })
})
