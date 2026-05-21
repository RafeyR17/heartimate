import { withAuthedApi } from '@/lib/with-authed-api'
import { buildSystemPrompt, sanitizeInput } from '@/lib/prompt'
import {
  createStaticTextStream,
  moderateUserMessage,
} from '@/lib/chat-moderation'
import { emitLlmMetrics, type LlmCompletionMeta } from '@/lib/llm-telemetry'
import {
  mergeChatAbortSignal,
  resolveChatModel,
  streamChat,
} from '@/lib/llm'
import { PROMPT_VERSION } from '@/lib/prompt-version'
import { getRelationshipLevel, shouldSpecialReply } from '@/lib/affection'
import { API_ERROR_CODES } from '@/lib/api-error-codes'
import { API_NOT_FOUND } from '@/lib/api-route-codes'
import { apiError, streamTextResponse } from '@/lib/api'
import { parseJsonBody, chatPostSchema } from '@/lib/api-schemas'
import { assertDailyChatQuota } from '@/lib/chat-daily-quota'
import {
  assertChatApiRateLimit,
  MAX_CHAT_REQUEST_BODY_BYTES,
  validateChatMessageContent,
} from '@/lib/chat-limits'
import {
  claimChatIdempotency,
  completeChatIdempotency,
  failChatIdempotency,
  normalizeIdempotencyKey,
  replayIdempotentChatResponse,
} from '@/lib/chat-idempotency'
import { runApiHandler } from '@/lib/observability/api-route'
import { fetchChatTurnContext } from '@/lib/chat-turn-context'
import { buildMessageHistoryForChatTurn } from '@/lib/chat-turn-messages'
import {
  finalizeAssistantTurn,
  rollbackUserMessage,
  type ChatRouteCharacter,
  type FinalizeTurnParams,
} from '@/lib/chat-route/finalize-turn'

export const POST = withAuthedApi(async (authed, req: Request) => {
  return runApiHandler('POST /api/chat', req, async ({ req, log, requestId, setUserId }) => {
    if (process.env.CHAT_DISABLED === 'true') {
      return apiError('Chat is temporarily unavailable', 503, {
        code: API_ERROR_CODES.CHAT_DISABLED,
      })
    }

    const contentLength = req.headers.get('content-length')
    if (contentLength) {
      const bytes = parseInt(contentLength, 10)
      if (Number.isFinite(bytes) && bytes > MAX_CHAT_REQUEST_BODY_BYTES) {
        return apiError('Request body too large', 413)
      }
    }

    const { supabase, user, clerkId } = authed
    setUserId(user.id)

    const bodyResult = await parseJsonBody(req, chatPostSchema)
    if (!bodyResult.ok) return bodyResult.response
    const { chatId, content, omitUserPersist } = bodyResult.data

    const messageCheck = validateChatMessageContent(content)
    if (!messageCheck.ok) {
      return apiError(messageCheck.error, messageCheck.status)
    }
    const messageContent = sanitizeInput(messageCheck.content)
    if (!messageContent) {
      return apiError('Message cannot be empty', 400)
    }

    const idempotencyKey = normalizeIdempotencyKey(req.headers.get('Idempotency-Key'))

    const [turnContext, claim] = await Promise.all([
      fetchChatTurnContext(supabase, chatId, user.id),
      idempotencyKey
        ? log.span('idempotency.claim', () =>
            claimChatIdempotency(user.id, chatId, idempotencyKey)
          )
        : Promise.resolve(null),
    ])

    if (!turnContext) {
      return apiError('Chat not found', 404, API_NOT_FOUND.chat)
    }

    if (claim) {
      if (claim.action === 'replay') {
        log.info('idempotency.replay', { chatId })
        return replayIdempotentChatResponse(claim.body, claim.headers)
      }
      if (claim.action === 'in_progress') {
        return claim.response
      }
      if (claim.action === 'unavailable') {
        return claim.response
      }
    }

    const character = turnContext.character as ChatRouteCharacter
    const chat = turnContext.chat
    const persona = turnContext.persona
      ? {
          name: turnContext.persona.name,
          short_bio: turnContext.persona.short_bio,
          appearance: turnContext.persona.appearance,
          personality: turnContext.persona.personality,
        }
      : null

    const baseAffection = chat.affection_score
    const baseTotalMessages = chat.total_messages
    const userAffectionGain = messageContent.length > 100 ? 3 : 2
    const projectedMessageCount = baseTotalMessages + 1
    const crossTenMessageBonus =
      baseTotalMessages <= 10 && projectedMessageCount > 10 ? 5 : 0
    const projectedAfterUser = baseAffection + userAffectionGain + crossTenMessageBonus
    const projectedAfterAssistant = projectedAfterUser + 1
    const prevRelationship = getRelationshipLevel(baseAffection)
    const nextRelationship = getRelationshipLevel(projectedAfterAssistant)
    const levelUp = prevRelationship.level !== nextRelationship.level

    const isSpecialReply = shouldSpecialReply(
      prevRelationship,
      nextRelationship,
      levelUp
    )

    let systemPrompt = buildSystemPrompt(
      character,
      turnContext.memorySummary ?? undefined,
      persona ? undefined : user.display_name,
      user.kink_prefs ?? undefined,
      persona,
      nextRelationship
    )

    if (isSpecialReply) {
      systemPrompt += `\n\nSPECIAL MOMENT: This is a pivotal moment.
Give an exceptionally deep, emotionally powerful, or unexpectedly intimate response.
Make this message one they will remember.
Be more vulnerable, more intense, or more passionate than usual.`
    }

    const skipPersistUser = omitUserPersist === true

    const historyBuilt = buildMessageHistoryForChatTurn({
      contextMessages: turnContext.messages,
      messageContent,
      omitUserPersist: skipPersistUser,
      sanitize: sanitizeInput,
    })
    if (!historyBuilt.ok) {
      return apiError(
        'Last message must be user when omitUserPersist is set',
        400
      )
    }
    const messageHistory = historyBuilt.history

    const dailyLimited = await log.span('daily_quota', () =>
      assertDailyChatQuota(user.id)
    )
    if (dailyLimited) return dailyLimited

    const rateLimitPromise = log.span('rate_limit', () =>
      assertChatApiRateLimit(user.id, {
        isRegenerate: omitUserPersist === true,
      })
    )

    let userMessageId: string | null = null

    if (!skipPersistUser) {
      const [userInsertResult, rateLimited] = await Promise.all([
        supabase
          .from('messages')
          .insert({
            chat_id: chatId,
            role: 'user',
            content: messageContent,
          })
          .select('id')
          .single(),
        rateLimitPromise,
      ])

      if (rateLimited) {
        if (idempotencyKey) {
          await failChatIdempotency(user.id, idempotencyKey)
        }
        return rateLimited
      }

      const { data: userRow, error: userInsertError } = userInsertResult

      if (userInsertError || !userRow) {
        log.error('persist.user_insert_failed', {
          chatId,
          error: userInsertError?.message,
        })
        return apiError('Failed to save message', 500)
      }
      userMessageId = userRow.id as string

      void supabase
        .from('chats')
        .update({
          last_message_at: new Date().toISOString(),
          last_message_preview: messageContent.slice(0, 200),
          last_message_role: 'user',
        })
        .eq('id', chatId)
        .eq('user_id', user.id)
        .then(({ error: previewError }) => {
          if (previewError) {
            log.warn('persist.chat_preview_failed', {
              chatId,
              error: previewError.message,
            })
          }
        })
    }

    const chatModel = resolveChatModel(character.is_nsfw)
    const streamOptions = {
      isNsfw: character.is_nsfw,
      signal: mergeChatAbortSignal(req.signal),
      onComplete: (meta: LlmCompletionMeta) => {
        emitLlmMetrics(log, 'llm.stream_complete', meta)
      },
    }

    const moderation = await log.span('moderation', () =>
      moderateUserMessage({
        message: messageContent,
        characterName: character.name,
        isNsfw: character.is_nsfw,
        signal: streamOptions.signal,
      })
    )

    let stream: ReadableStream<Uint8Array>
    try {
      if (!moderation.allowed) {
        log.info('moderation.refused', {
          chatId,
          category: moderation.category,
          promptVersion: PROMPT_VERSION,
        })
        if (skipPersistUser) {
          const rateLimited = await rateLimitPromise
          if (rateLimited) {
            if (idempotencyKey) {
              await failChatIdempotency(user.id, idempotencyKey)
            }
            return rateLimited
          }
        }
        stream = createStaticTextStream(moderation.refusalText)
      } else if (skipPersistUser) {
        const [rateLimited, streamResult] = await Promise.all([
          rateLimitPromise,
          log.span('llm.stream_start', () =>
            streamChat(messageHistory, systemPrompt, streamOptions)
          ),
        ])
        if (rateLimited) {
          if (idempotencyKey) {
            await failChatIdempotency(user.id, idempotencyKey)
          }
          return rateLimited
        }
        stream = streamResult
      } else {
        stream = await log.span('llm.stream_start', () =>
          streamChat(messageHistory, systemPrompt, streamOptions)
        )
      }
    } catch (streamError) {
      await rollbackUserMessage(supabase, userMessageId)
      if (idempotencyKey) {
        await failChatIdempotency(user.id, idempotencyKey)
      }
      log.error('llm.stream_start_failed', {
        chatId,
        error: streamError instanceof Error ? streamError.message : String(streamError),
      })
      return apiError('AI service unavailable', 503)
    }

    let fullResponse = ''
    const streamHeaders: Record<string, string> = {
      'X-Special-Reply': String(isSpecialReply),
      'X-Level-Up': String(levelUp),
      'X-Relationship-Level': nextRelationship.level,
      'X-Relationship-Label': nextRelationship.label,
      'X-Relationship-Color': nextRelationship.color,
      'X-Relationship-Progress': String(nextRelationship.progress),
      'X-Relationship-Score': String(projectedAfterAssistant),
      'X-Relationship-Next': String(nextRelationship.next),
    }
    const reader = stream.getReader()
    const messageDelta = skipPersistUser ? 1 : 2

    const finalizeParams: Omit<FinalizeTurnParams, 'assistantContent'> = {
      chatId,
      supabase,
      clerkId,
      character,
      baseTotalMessages,
      messageDelta,
      projectedAfterUser,
      projectedAfterAssistant,
      prevRelationship,
      levelUp,
      messageHistory,
      userMessageId,
      userId: user.id,
      idempotencyKey,
    }

    const responseStream = new ReadableStream({
      async start(controller) {
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) {
              const ok = await log.span('finalize_turn', () =>
                finalizeAssistantTurn({
                  ...finalizeParams,
                  assistantContent: fullResponse,
                })
              )
              if (!ok) {
                if (idempotencyKey) {
                  await failChatIdempotency(user.id, idempotencyKey)
                }
                controller.error(new Error('Failed to save assistant reply'))
                return
              }
              if (idempotencyKey) {
                await completeChatIdempotency(
                  user.id,
                  idempotencyKey,
                  fullResponse,
                  streamHeaders
                )
              }
              controller.close()
              return
            }
            const text = new TextDecoder().decode(value)
            fullResponse += text
            controller.enqueue(value)
          }
        } catch (err) {
          const partial = fullResponse.trim()
          const assistantContent = partial
            ? `${fullResponse} *[message interrupted]*`
            : ''
          const ok = await log.span('finalize_turn_partial', () =>
            finalizeAssistantTurn({
              ...finalizeParams,
              assistantContent,
            })
          )
          if (!ok) {
            if (idempotencyKey) {
              await failChatIdempotency(user.id, idempotencyKey)
            }
            controller.error(err as Error)
            return
          }
          if (idempotencyKey) {
            await completeChatIdempotency(
              user.id,
              idempotencyKey,
              assistantContent || fullResponse,
              streamHeaders
            )
          }
          controller.error(err as Error)
        }
      },
    })

    log.info('llm.stream_response', {
      chatId,
      omitUserPersist: skipPersistUser,
      model: chatModel,
      promptVersion: PROMPT_VERSION,
      ...(moderation.allowed && moderation.circuitBypass
        ? { moderationCircuitBypass: true }
        : {}),
    })
    return streamTextResponse(responseStream, streamHeaders, { requestId })
  })
})
