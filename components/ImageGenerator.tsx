'use client'

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type RefObject,
} from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import {
  Check,
  ChevronDown,
  ChevronUp,
  Loader2,
  Sparkles,
  X,
} from 'lucide-react'
import { useToast } from '@/components/ToastProvider'
import { getDetectedGenderLabel, type CharacterImageInput } from '@/lib/imagegen'
import { verifyImageLoads } from '@/lib/imagegen-client'

const LOADING_MESSAGES = [
  (name: string) => `Imagining ${name || 'your character'}...`,
  () => 'Painting the details...',
  () => 'Almost ready...',
  () => 'Adding the magic...',
]

const PROMPT_SUGGESTIONS = [
  'Mysterious dark sorceress',
  'Brooding handsome villain',
  'Sweet innocent angel',
  'Fierce warrior queen',
]

const GENERATE_COOLDOWN_MS = 3000

type ImageGeneratorProps = {
  characterData: CharacterImageInput
  onImageSelected: (url: string) => void
  currentImage?: string
  uploadInputRef?: RefObject<HTMLInputElement | null>
}

export function ImageGenerator({
  characterData,
  onImageSelected,
  uploadInputRef,
}: ImageGeneratorProps) {
  const { error: toastError } = useToast()
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )
  const [isOpen, setIsOpen] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [customPrompt, setCustomPrompt] = useState('')
  const [useCustomPrompt, setUseCustomPrompt] = useState(false)
  const [generatedImages, setGeneratedImages] = useState<string[]>([])
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [loaded, setLoaded] = useState<boolean[]>([])
  const [failed, setFailed] = useState<boolean[]>([])
  const [autoPrompt, setAutoPrompt] = useState('')
  const [promptExpanded, setPromptExpanded] = useState(false)
  const [genError, setGenError] = useState<string | null>(null)
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0)

  const lastGenerateRef = useRef(0)
  const retryScheduledRef = useRef(false)
  const runGenerateRef = useRef<(isRetry?: boolean) => Promise<void>>(async () => {})

  useEffect(() => {
    if (!isGenerating) return
    const id = setInterval(() => {
      setLoadingMsgIndex((i) => (i + 1) % LOADING_MESSAGES.length)
    }, 3000)
    return () => clearInterval(id)
  }, [isGenerating])

  const runGenerate = useCallback(
    async (isRetry = false) => {
      const now = Date.now()
      if (now - lastGenerateRef.current < GENERATE_COOLDOWN_MS && !isRetry) {
        toastError(
          'Please wait',
          'Please wait a moment before generating again'
        )
        return
      }
      lastGenerateRef.current = now
      setGenError(null)
      setIsGenerating(true)
      setGeneratedImages([])
      setSelectedImage(null)
      setLoaded([])
      setFailed([])

      try {
        const res = await fetch('/api/generate-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...characterData,
            customPrompt: useCustomPrompt ? customPrompt.trim() : undefined,
            variationCount: 3,
          }),
        })
        const data = (await res.json()) as {
          success?: boolean
          error?: string
          prompt?: string
          mainUrl?: string
          variationUrls?: string[]
        }

        if (!res.ok || !data.success || !data.mainUrl) {
          throw new Error(data.error ?? 'Generation failed')
        }

        setAutoPrompt(data.prompt ?? '')
        const allUrls = [
          data.mainUrl,
          ...(data.variationUrls ?? []).slice(0, 2),
        ].slice(0, 3)
        setGeneratedImages(allUrls)
        setLoaded(allUrls.map(() => false))
        setFailed(allUrls.map(() => false))
        retryScheduledRef.current = false
      } catch (err) {
        console.error(err)
        setGenError(
          'Generation failed — Pollinations may be busy. Try again in a moment.'
        )
        if (!retryScheduledRef.current) {
          retryScheduledRef.current = true
          window.setTimeout(() => {
            void runGenerateRef.current(true)
          }, 3000)
        }
      } finally {
        setIsGenerating(false)
      }
    },
    [characterData, customPrompt, toastError, useCustomPrompt]
  )

  useEffect(() => {
    runGenerateRef.current = runGenerate
  }, [runGenerate])

  const handleImageLoad = (index: number) => {
    setLoaded((prev) => {
      const next = [...prev]
      next[index] = true
      return next
    })
  }

  const handleImageError = (index: number) => {
    setFailed((prev) => {
      const next = [...prev]
      next[index] = true
      return next
    })
    setLoaded((prev) => {
      const next = [...prev]
      next[index] = true
      return next
    })
  }

  const regenerateSlot = async (index: number) => {
    try {
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...characterData,
          customPrompt: useCustomPrompt ? customPrompt.trim() : undefined,
          variationCount: 1,
        }),
      })
      const data = (await res.json()) as { success?: boolean; mainUrl?: string }
      if (data.success && data.mainUrl) {
        const ok = await verifyImageLoads(data.mainUrl, 20_000)
        if (ok) {
          setGeneratedImages((prev) => {
            const next = [...prev]
            next[index] = data.mainUrl!
            return next
          })
          setFailed((prev) => {
            const next = [...prev]
            next[index] = false
            return next
          })
          setLoaded((prev) => {
            const next = [...prev]
            next[index] = false
            return next
          })
        }
      }
    } catch {
      /* ignore */
    }
  }

  const handleConfirm = () => {
    if (!selectedImage) return
    // Pollinations URLs may expire; for permanent storage, download and re-upload to Supabase Storage later.
    onImageSelected(selectedImage)
    setIsOpen(false)
  }

  const detectedGender = getDetectedGenderLabel(characterData)
  const loadingLabel =
    LOADING_MESSAGES[loadingMsgIndex]?.(characterData.name) ??
    LOADING_MESSAGES[0](characterData.name)

  const modal = (
    <div
      className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-4"
      style={{ background: 'rgba(8,6,8,0.9)', backdropFilter: 'blur(20px)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="image-gen-title"
    >
      <div
        className="w-full md:max-w-[640px] md:w-[calc(100%-32px)] max-h-[95vh] md:max-h-[90vh] overflow-y-auto rounded-t-[20px] md:rounded-[24px] border border-white/[0.08] p-6 md:p-8"
        style={{ background: '#0d0a0e' }}
      >
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h2
              id="image-gen-title"
              className="font-heading italic text-[22px] text-white"
            >
              Generate Character Image
            </h2>
            <p className="text-[12px] text-white/40 mt-1">
              Powered by Pollinations AI · Free · Instant
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="p-2 rounded-full text-white/50 hover:text-white hover:bg-white/5 transition-colors"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex gap-2 mb-4 p-1 rounded-full bg-white/[0.04] border border-white/[0.06]">
          <button
            type="button"
            onClick={() => setUseCustomPrompt(false)}
            className={`flex-1 py-2 px-3 rounded-full text-[12px] font-medium transition-colors ${
              !useCustomPrompt
                ? 'bg-[#e8507a] text-white'
                : 'text-white/50 hover:text-white/80'
            }`}
          >
            Auto (from character data)
          </button>
          <button
            type="button"
            onClick={() => setUseCustomPrompt(true)}
            className={`flex-1 py-2 px-3 rounded-full text-[12px] font-medium transition-colors ${
              useCustomPrompt
                ? 'bg-[#e8507a] text-white'
                : 'text-white/50 hover:text-white/80'
            }`}
          >
            Custom prompt
          </button>
        </div>

        {!useCustomPrompt ? (
          <div className="mb-4 rounded-[10px] border border-white/[0.08] bg-white/[0.03] p-3 text-[12px] text-white/50 space-y-1">
            <p>
              Generating for:{' '}
              <span className="text-white/80">{characterData.name || '—'}</span>
            </p>
            <p>
              Style:{' '}
              <span className="text-white/80">
                {characterData.tags?.slice(0, 2).join(', ') || '—'}
              </span>
            </p>
            <p>
              Gender: <span className="text-white/80">{detectedGender}</span>
            </p>
          </div>
        ) : (
          <div className="mb-4">
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="Describe exactly how you want them to look..."
              rows={3}
              className="w-full rounded-[10px] border border-white/[0.08] bg-[#120d14] px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-[#e8507a]/40 focus:outline-none resize-none"
            />
            <p className="text-[11px] text-white/40 mt-2 mb-1.5">Try:</p>
            <div className="flex flex-wrap gap-2">
              {PROMPT_SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setCustomPrompt(s)}
                  className="text-[11px] px-3 py-1 rounded-full border border-white/10 text-white/60 hover:border-[#e8507a]/40 hover:text-[#e8507a] transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => void runGenerate()}
          disabled={isGenerating || (useCustomPrompt && !customPrompt.trim())}
          className="w-full h-12 rounded-[12px] bg-[#e8507a] text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#e8507a]/90 transition-colors mb-4"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {loadingLabel}
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Generate 3 Images
            </>
          )}
        </button>

        {genError && (
          <div className="mb-4 text-center">
            <p className="text-[13px] text-[#e8507a] mb-2">{genError}</p>
            <button
              type="button"
              onClick={() => void runGenerate()}
              className="text-[13px] text-white/70 underline hover:text-white"
            >
              Retry now
            </button>
          </div>
        )}

        {isGenerating && (
          <div className="mb-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 overflow-x-auto pb-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="aspect-[2/3] rounded-[12px] image-gen-shimmer flex-shrink-0 min-w-[45%] sm:min-w-0"
                />
              ))}
            </div>
            <p className="text-[12px] text-white/50 text-center mt-3">
              Generating your character… This takes 5–15 seconds
            </p>
            <div className="h-1 mt-2 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full w-1/3 rounded-full bg-[#e8507a] image-gen-progress" />
            </div>
          </div>
        )}

        {generatedImages.length > 0 && !isGenerating && (
          <>
            <div className="flex gap-3 overflow-x-auto snap-x pb-2 mb-3 scrollbar-hide">
              {generatedImages.map((url, index) => {
                const isSelected = selectedImage === url
                const isLoaded = loaded[index]
                const isFailed = failed[index]
                return (
                  <button
                    key={`${url}-${index}`}
                    type="button"
                    onClick={() => !isFailed && setSelectedImage(url)}
                    className={`relative flex-shrink-0 w-[45%] sm:w-auto sm:flex-1 aspect-[2/3] rounded-[12px] overflow-hidden snap-center transition-all duration-200 ${
                      isSelected
                        ? 'border-2 border-[#e8507a] shadow-[0_0_30px_rgba(232,80,122,0.4)]'
                        : 'border-2 border-transparent hover:border-[#e8507a]/40'
                    } ${isFailed ? 'cursor-default' : 'cursor-pointer hover:brightness-110'}`}
                  >
                    {!isFailed && (
                      <Image
                        src={url}
                        alt={`Variation ${index + 1}`}
                        fill
                        unoptimized
                        className="object-cover"
                        sizes="(max-width: 640px) 45vw, 200px"
                        onLoad={() => handleImageLoad(index)}
                        onError={() => handleImageError(index)}
                      />
                    )}
                    {(!isLoaded || isFailed) && (
                      <div className="absolute inset-0 image-gen-shimmer flex flex-col items-center justify-center gap-2">
                        {isFailed ? (
                          <>
                            <span className="text-[11px] text-white/50 px-2 text-center">
                              Failed to load
                            </span>
                            <span
                              role="button"
                              tabIndex={0}
                              className="text-[12px] text-[#e8507a]"
                              onClick={(e) => {
                                e.stopPropagation()
                                void regenerateSlot(index)
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') void regenerateSlot(index)
                              }}
                            >
                              ↺ Try another
                            </span>
                          </>
                        ) : (
                          <Loader2 className="h-6 w-6 text-[#e8507a] animate-spin" />
                        )}
                      </div>
                    )}
                    {isSelected && !isFailed && (
                      <span className="absolute bottom-2 right-2 w-7 h-7 rounded-full bg-[#e8507a] flex items-center justify-center">
                        <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            <button
              type="button"
              onClick={() => void runGenerate()}
              className="text-[13px] text-[#e8507a] mb-4 hover:underline block mx-auto"
            >
              ↺ Regenerate all
            </button>

            {autoPrompt && (
              <div className="mb-4">
                <button
                  type="button"
                  onClick={() => setPromptExpanded((v) => !v)}
                  className="flex items-center gap-1 text-[12px] text-white/50 hover:text-white/70"
                >
                  View prompt used
                  {promptExpanded ? (
                    <ChevronUp className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" />
                  )}
                </button>
                {promptExpanded && (
                  <div className="mt-2 rounded-[10px] border border-white/[0.08] bg-black/30 p-3">
                    <p className="text-[11px] text-white/60 max-h-24 overflow-y-auto whitespace-pre-wrap">
                      {autoPrompt}
                    </p>
                    <button
                      type="button"
                      onClick={() => void navigator.clipboard.writeText(autoPrompt)}
                      className="mt-2 text-[11px] text-[#e8507a] hover:underline"
                    >
                      Copy prompt
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        <button
          type="button"
          onClick={handleConfirm}
          disabled={!selectedImage}
          className="w-full py-3 rounded-full bg-[#e8507a] text-white font-heading italic text-[16px] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#e8507a]/90 transition-colors"
        >
          Use this image →
        </button>

        <button
          type="button"
          onClick={() => {
            setIsOpen(false)
            uploadInputRef?.current?.click()
          }}
          className="w-full mt-3 text-[12px] text-white/40 hover:text-white/60 transition-colors"
        >
          or upload your own
        </button>
      </div>
    </div>
  )

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-[8px] border border-[rgba(232,80,122,0.2)] bg-[rgba(232,80,122,0.08)] px-3.5 py-2 text-[12px] font-medium text-[#e8507a] transition-colors hover:bg-[rgba(232,80,122,0.15)]"
        style={{ fontFamily: 'var(--font-body), system-ui, sans-serif' }}
      >
        <Sparkles className="h-3.5 w-3.5" strokeWidth={2} />
        Generate with AI
      </button>

      {mounted && isOpen && createPortal(modal, document.body)}

      <style jsx global>{`
        .image-gen-shimmer {
          background: linear-gradient(
            110deg,
            rgba(232, 80, 122, 0.08) 8%,
            rgba(232, 80, 122, 0.18) 18%,
            rgba(232, 80, 122, 0.08) 33%
          );
          background-size: 200% 100%;
          animation: imageGenShimmer 1.5s linear infinite;
        }
        @keyframes imageGenShimmer {
          to {
            background-position-x: -200%;
          }
        }
        .image-gen-progress {
          animation: imageGenProgress 1.2s ease-in-out infinite;
        }
        @keyframes imageGenProgress {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(350%);
          }
        }
      `}</style>
    </>
  )
}
