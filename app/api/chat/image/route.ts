import { withAuthedApi } from '@/lib/with-authed-api'
import { apiError, apiSuccess } from '@/lib/api'
import { API_ERROR_CODES } from '@/lib/api-error-codes'
import { API_NOT_FOUND } from '@/lib/api-route-codes'
import { parseJsonBody, chatImagePostSchema } from '@/lib/api-schemas'
import { assertApiRateLimit } from '@/lib/api-rate-limits'
import { assertDailyChatQuota } from '@/lib/chat-daily-quota'
import {
  buildScenePrompt,
  generateChatImageVariations,
} from '@/lib/chat-imagegen'
import { incrementQuota } from '@/lib/quota'
import { runApiHandler } from '@/lib/observability/api-route'
import { serverLog } from '@/lib/server-log'

const IMAGE_CAPTION = '*sends you a picture*'

export const POST = withAuthedApi(async (authed, req: Request) => {
  return runApiHandler('POST /api/chat/image', req, async ({ req: request, setUserId }) => {
    const { supabase, user } = authed
    setUserId(user.id)

    const rateLimited = await assertApiRateLimit(user.id, 'chat_image')
    if (rateLimited) return rateLimited

    const bodyResult = await parseJsonBody(request, chatImagePostSchema)
    if (!bodyResult.ok) return bodyResult.response

    const {
      chatId,
      characterId,
      userRequest,
      relationshipLevel,
      selectedImageUrl,
      prompt: clientPrompt,
    } = bodyResult.data

    const { data: chat } = await supabase
      .from('chats')
      .select('id, character_id')
      .eq('id', chatId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!chat || chat.character_id !== characterId) {
      return apiError('Chat not found', 404, API_NOT_FOUND.chat)
    }

    const { data: character, error: charError } = await supabase
      .from('characters')
      .select('name, description, personality, tags')
      .eq('id', characterId)
      .maybeSingle()

    if (charError || !character) {
      return apiError('Character not found', 404, API_NOT_FOUND.character)
    }

    const prompt =
      clientPrompt?.trim() ||
      buildScenePrompt(
        {
          name: character.name as string,
          description: (character.description as string | null) ?? undefined,
          personality: (character.personality as string | null) ?? undefined,
          tags: Array.isArray(character.tags) ? (character.tags as string[]) : [],
        },
        userRequest,
        relationshipLevel
      )

    if (!selectedImageUrl) {
      const imageUrls = generateChatImageVariations(prompt, 3)
      return apiSuccess({ prompt, imageUrls })
    }

    const dailyGate = await assertDailyChatQuota(user.id, supabase)
    if (!dailyGate.ok) return dailyGate.response

    const { data: messageId, error: rpcError } = await supabase.rpc(
      'insert_chat_image_message',
      {
        p_chat_id: chatId,
        p_user_id: user.id,
        p_image_url: selectedImageUrl,
        p_image_prompt: prompt,
        p_content: IMAGE_CAPTION,
      }
    )

    if (rpcError || !messageId) {
      const rpcMsg = rpcError?.message ?? ''
      const missingFn =
        /insert_chat_image_message|function.*does not exist|42883/i.test(rpcMsg)
      const missingCol = rpcError?.code === '42703'
      if (missingFn || missingCol) {
        return apiError(
          'In-chat images need a database update. Run supabase/migrations/20240612_chat_image_messages.sql in the Supabase SQL editor, then try again.',
          503,
          { code: API_ERROR_CODES.MIGRATION_REQUIRED }
        )
      }
      serverLog.error('chat-image', 'insert_chat_image_message failed', {
        userId: user.id,
        chatId,
        message: rpcMsg,
        code: rpcError?.code,
      })
      return apiError('Could not save image message', 503, {
        code: API_ERROR_CODES.SERVICE_UNAVAILABLE,
      })
    }

    const quota = dailyGate.quota
    if (!quota.isByok && !quota.isPremium) {
      await incrementQuota(user.id, supabase)
    }

    const { data: row } = await supabase
      .from('messages')
      .select('id, role, content, created_at, message_type, image_url, image_prompt')
      .eq('id', messageId as string)
      .single()

    return apiSuccess({
      prompt,
      message: row
        ? {
            id: row.id as string,
            role: 'assistant' as const,
            content: row.content as string,
            created_at: row.created_at as string,
            message_type: 'image' as const,
            image_url: row.image_url as string,
            image_prompt: row.image_prompt as string,
          }
        : {
            id: messageId as string,
            role: 'assistant' as const,
            content: IMAGE_CAPTION,
            created_at: new Date().toISOString(),
            message_type: 'image' as const,
            image_url: selectedImageUrl,
            image_prompt: prompt,
          },
    })
  })
})
