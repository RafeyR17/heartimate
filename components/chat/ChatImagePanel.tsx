'use client'

import { useCallback, useEffect, useState } from 'react'
import { Camera, Check, Loader2, X } from 'lucide-react'
import { PollinationsThumbnail } from '@/components/chat/PollinationsThumbnail'
import { useToast } from '@/components/ToastProvider'
import { apiFetch } from '@/lib/api-client'
import type { Message } from '@/lib/chat-ui-types'

const LOADING_LINES = [
  (name: string) => `${name} is taking a photo...`,
  () => 'Developing the image...',
  () => 'Almost ready...',
]

function getQuickSuggestions(tags: string[]): string[] {
  const suggestions: string[] = []

  if (tags.includes('Dark Fantasy')) {
    suggestions.push('Show me your true form', 'Standing in the moonlight', 'In your dark castle')
  }
  if (tags.includes('Romance')) {
    suggestions.push('Smile for me', 'Looking at me', 'Getting ready for our date')
  }
  if (tags.includes('Cyberpunk')) {
    suggestions.push('In neon city lights', 'Hacking something', 'Rooftop at night')
  }
  if (tags.includes('Supernatural')) {
    suggestions.push('Using your powers', 'In the spirit realm', 'True supernatural form')
  }

  if (suggestions.length === 0) {
    suggestions.push('Send me a selfie', 'How you look right now', 'Smiling at me')
  }

  return suggestions.slice(0, 4)
}

export type ChatImagePanelProps = {
  isOpen: boolean
  onClose: () => void
  onMessageSent: (message: Message) => void
  character: { name: string; tags?: string[] }
  chatId: string
  characterId: string
  relationshipLevel?: string
  prefilledRequest?: string
  onQuotaExceeded?: (resetIn?: string) => void
}

export function ChatImagePanel({
  isOpen,
  onClose,
  onMessageSent,
  character,
  chatId,
  characterId,
  relationshipLevel,
  prefilledRequest = '',
  onQuotaExceeded,
}: ChatImagePanelProps) {
  const { error: toastError } = useToast()
  const [generating, setGenerating] = useState(false)
  const [customRequest, setCustomRequest] = useState(prefilledRequest)
  const [generatedImages, setGeneratedImages] = useState<string[]>([])
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [prompt, setPrompt] = useState('')
  const [readySlots, setReadySlots] = useState<Set<number>>(new Set())
  const [loadingLine, setLoadingLine] = useState(0)
  const [genError, setGenError] = useState<string | null>(null)

  const suggestions = getQuickSuggestions(character.tags ?? [])
  const firstName = character.name.split(' ')[0]

  useEffect(() => {
    if (!generating) return
    const id = setInterval(() => {
      setLoadingLine((i) => (i + 1) % LOADING_LINES.length)
    }, 2000)
    return () => clearInterval(id)
  }, [generating])

  const handleGenerate = useCallback(async () => {
    setGenerating(true)
    setGenError(null)
    setGeneratedImages([])
    setSelectedImage(null)
    setReadySlots(new Set())

    try {
      const result = await apiFetch<{
        prompt: string
        imageUrls: string[]
      }>('/api/chat/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId,
          characterId,
          userRequest: customRequest.trim() || null,
          relationshipLevel,
        }),
      })

      if (!result.ok) {
        throw new Error(result.error)
      }

      setPrompt(result.data.prompt)
      setGeneratedImages(result.data.imageUrls)
    } catch (err) {
      console.error(err)
      setGenError('Could not generate images. Try again in a moment.')
      toastError('Generation failed', 'Pollinations may be busy — try again.')
    } finally {
      setGenerating(false)
    }
  }, [
    chatId,
    characterId,
    customRequest,
    relationshipLevel,
    toastError,
  ])

  async function handleSend() {
    if (!selectedImage || !prompt) return

    setGenerating(true)
    setGenError(null)

    try {
      const result = await apiFetch<{ message: Message }>('/api/chat/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId,
          characterId,
          selectedImageUrl: selectedImage,
          prompt,
          relationshipLevel,
        }),
      })

      if (!result.ok) {
        if (
          result.code === 'quota_exceeded' ||
          result.code === 'daily_chat_limit'
        ) {
          onQuotaExceeded?.(result.resetIn)
          onClose()
          return
        }
        if (result.code === 'migration_required') {
          throw new Error(result.error)
        }
        throw new Error(
          result.error ||
            (result.status === 503
              ? 'Could not verify daily limit or save the image. Check Supabase migrations and SUPABASE_SERVICE_ROLE_KEY in .env.local.'
              : 'Could not send image')
        )
      }

      onMessageSent(result.data.message)
      onClose()
      setGeneratedImages([])
      setSelectedImage(null)
      setCustomRequest('')
      setPrompt('')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not send image'
      setGenError(msg)
      toastError('Could not send', msg)
    } finally {
      setGenerating(false)
    }
  }

  const loadingLabel =
    LOADING_LINES[loadingLine]?.(firstName) ?? LOADING_LINES[0](firstName)

  return (
    <>
      {isOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          aria-label="Close image panel"
          onClick={onClose}
        />
      )}

      <div
        className={`fixed bottom-0 left-0 right-0 z-50 max-h-[90vh] overflow-y-auto rounded-t-[20px] border-t border-white/[0.08] bg-[#0d0a0e] transition-transform duration-350 ease-[cubic-bezier(0.4,0,0.2,1)] ${
          isOpen ? 'translate-y-0' : 'translate-y-full pointer-events-none'
        }`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        aria-hidden={!isOpen}
      >
        <div className="flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-2">
            <Camera className="h-[18px] w-[18px] text-[#e8507a]" />
            <span className="text-[15px] font-semibold text-white">Generate Image</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-full text-white/50 hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            <X size={22} />
          </button>
        </div>

        <p className="px-5 text-[10px] font-label uppercase tracking-widest text-white/40">
          Quick requests
        </p>
        <div className="mt-2 flex gap-2 overflow-x-auto px-5 pb-1 scrollbar-hide">
          {suggestions.map((s) => {
            const active = customRequest === s
            return (
              <button
                key={s}
                type="button"
                onClick={() => setCustomRequest(s)}
                className={`shrink-0 whitespace-nowrap rounded-full border px-3.5 py-2 text-[13px] transition-colors ${
                  active
                    ? 'border-[#e8507a] text-[#e8507a] bg-[#e8507a]/10'
                    : 'border-white/[0.08] bg-white/[0.04] text-white/50 hover:border-[#e8507a]/30'
                }`}
              >
                {s}
              </button>
            )
          })}
        </div>

        <div className="mx-5 mt-3">
          <textarea
            value={customRequest}
            onChange={(e) => setCustomRequest(e.target.value)}
            placeholder="Describe what you want to see… e.g. Send me a selfie smiling"
            rows={2}
            className="w-full resize-none rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-[#e8507a]/30 focus:outline-none"
          />
        </div>

        <div className="mx-5 mt-3">
          <button
            type="button"
            onClick={() => void handleGenerate()}
            disabled={generating}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#e8507a] text-sm font-semibold text-white disabled:opacity-50 hover:bg-[#e8507a]/90"
          >
            {generating && !generatedImages.length ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {loadingLabel}
              </>
            ) : (
              <>
                <Camera className="h-4 w-4" />
                Generate Image
              </>
            )}
          </button>
        </div>

        {genError && (
          <p className="mx-5 mt-2 text-center text-[13px] text-[#e8507a]">{genError}</p>
        )}

        {generating && generatedImages.length === 0 && (
          <div className="px-5 py-4">
            <div className="grid grid-cols-3 gap-2.5">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="aspect-square rounded-xl chat-image-shimmer"
                />
              ))}
            </div>
            <p className="mt-3 text-center text-[12px] text-white/40">
              Building prompts… previews may take up to a minute
            </p>
          </div>
        )}

        {generatedImages.length > 0 && (
          <div className="px-5 py-4">
            <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-hide sm:grid sm:grid-cols-3 sm:overflow-visible">
              {generatedImages.map((url, index) => {
                const isSelected = selectedImage === url
                const isReady = readySlots.has(index)
                return (
                  <button
                    key={`${url}-${index}`}
                    type="button"
                    onClick={() => isReady && setSelectedImage(url)}
                    disabled={!isReady}
                    className={`relative aspect-square w-[42vw] max-w-[140px] shrink-0 overflow-hidden rounded-xl border-2 transition-all sm:w-auto ${
                      isSelected
                        ? 'border-[#e8507a] shadow-[0_0_20px_rgba(232,80,122,0.4)]'
                        : 'border-transparent hover:border-[#e8507a]/30'
                    } ${!isReady ? 'cursor-wait' : 'cursor-pointer'}`}
                  >
                    <PollinationsThumbnail
                      key={url}
                      url={url}
                      alt={`Variation ${index + 1}`}
                      onLoaded={() =>
                        setReadySlots((prev) => new Set(prev).add(index))
                      }
                    />
                    {isSelected && isReady && (
                      <span className="absolute bottom-2 right-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-[#e8507a]">
                        <Check className="h-3 w-3 text-white" strokeWidth={3} />
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
            <button
              type="button"
              onClick={() => void handleGenerate()}
              disabled={generating}
              className="mt-3 block w-full text-center text-[12px] text-[#e8507a] hover:underline disabled:opacity-50"
            >
              ↺ Try again
            </button>
          </div>
        )}

        {generatedImages.length > 0 && (
          <div className="mx-5 mb-5">
            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={!selectedImage || generating || readySlots.size === 0}
              className="flex h-12 w-full items-center justify-center rounded-full bg-[#e8507a] text-[15px] font-heading italic text-white disabled:opacity-40 hover:bg-[#e8507a]/90"
            >
              Send to {firstName} →
            </button>
          </div>
        )}
      </div>

      <style jsx global>{`
        .chat-image-shimmer {
          background: linear-gradient(
            110deg,
            rgba(232, 80, 122, 0.08) 8%,
            rgba(232, 80, 122, 0.2) 18%,
            rgba(232, 80, 122, 0.08) 33%
          );
          background-size: 200% 100%;
          animation: chatImageShimmer 1.5s linear infinite;
        }
        @keyframes chatImageShimmer {
          to {
            background-position-x: -200%;
          }
        }
      `}</style>
    </>
  )
}
