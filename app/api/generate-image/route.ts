import { withAuthedApi } from '@/lib/with-authed-api'
import { apiSuccess } from '@/lib/api'
import { parseJsonBody, generateImagePostSchema } from '@/lib/api-schemas'
import { assertApiRateLimit } from '@/lib/api-rate-limits'
import {
  buildCharacterImagePrompt,
  generateImageUrl,
  generateVariationUrls,
} from '@/lib/imagegen'
import { runApiHandler } from '@/lib/observability/api-route'

export const POST = withAuthedApi(async (authed, req: Request) => {
  return runApiHandler('POST /api/generate-image', req, async ({ req: request, setUserId }) => {
    const { user } = authed
    setUserId(user.id)

    const rateLimited = await assertApiRateLimit(user.id, 'generate_image')
    if (rateLimited) return rateLimited

    const bodyResult = await parseJsonBody(request, generateImagePostSchema)
    if (!bodyResult.ok) return bodyResult.response

    const {
      name,
      description,
      personality,
      tags,
      gender,
      customPrompt,
      variationCount = 3,
      width = 512,
      height = 768,
    } = bodyResult.data

    const finalPrompt =
      customPrompt?.trim() ||
      buildCharacterImagePrompt({
        name: name ?? 'Character',
        description,
        personality,
        tags,
        gender,
      })

    const mainSeed = Math.floor(Math.random() * 999_999)
    const mainUrl = generateImageUrl(finalPrompt, { width, height, seed: mainSeed })
    const variationUrls = generateVariationUrls(finalPrompt, variationCount, {
      width,
      height,
    })

    return apiSuccess({
      prompt: finalPrompt,
      mainUrl,
      variationUrls,
      seed: mainSeed,
    })
  })
})
