'use client'

import { AvatarImage } from '@/components/ui/avatar-image'
import type { CharacterFormState } from './types'

type CharacterFormPreviewProps = {
  form: CharacterFormState
}

export function CharacterFormPreview({ form }: CharacterFormPreviewProps) {
  return (
    <div className="flex flex-col gap-6 w-full max-w-[320px] mx-auto md:mx-0">
      <div className="w-full rounded-[20px] border border-[rgba(255,255,255,0.08)] overflow-hidden bg-[#0d0a0e] relative flex flex-col shadow-2xl">
        <div className="relative aspect-[3/4] w-full flex-shrink-0">
          {form.avatarPreview ? (
            <AvatarImage
              src={form.avatarPreview}
              alt="Avatar Preview"
              fill
              className="object-cover"
              sizes="320px"
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center"
              style={{ background: 'linear-gradient(160deg, #1a0a20, #2d1040)' }}
            >
              <span className="text-[rgba(255,255,255,0.4)] italic text-[14px] font-heading">
                Avatar preview
              </span>
            </div>
          )}

          <div className="absolute top-3 left-3 flex gap-2 z-20">
            {form.isNsfw && (
              <span className="bg-[#e8507a] text-white text-[10px] font-bold px-2 py-0.5 rounded-full tracking-wide">
                18+
              </span>
            )}
          </div>
          <div className="absolute top-3 right-3 flex items-center gap-1.5 z-20 bg-black/40 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
            <span className="text-white text-[10px] font-medium tracking-wide">Online</span>
          </div>

          <div
            className="absolute inset-0 bg-gradient-to-t from-[#0d0a0e] via-[rgba(13,10,14,0.8)] to-transparent"
            style={{
              background:
                'linear-gradient(to top, #0d0a0e 0%, rgba(13,10,14,0.8) 30%, transparent 60%)',
            }}
          />
        </div>

        <div className="relative p-[16px] flex flex-col gap-2 -mt-16 z-10">
          <h2 className="font-heading text-[20px] text-white leading-tight">
            {form.name || (
              <span className="text-[rgba(255,255,255,0.4)]">Character Name</span>
            )}
          </h2>
          <p className="text-[12px] text-[rgba(255,255,255,0.6)] line-clamp-2 leading-relaxed">
            {form.description || 'Short description...'}
          </p>

          {form.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {form.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] text-[rgba(255,255,255,0.8)] bg-white/5 border border-white/10 px-2.5 py-0.5 rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          <div className="h-[1px] my-[12px] bg-[rgba(232,80,122,0.2)] w-full" />

          <button
            disabled
            className="w-full bg-[#e8507a] text-white rounded-[50px] py-2.5 text-[12px] uppercase tracking-widest font-semibold opacity-90 cursor-not-allowed"
          >
            Chat Now →
          </button>
        </div>
      </div>

      <div className="w-full">
        <h3 className="font-label text-[11px] uppercase tracking-[0.15em] text-[rgba(255,255,255,0.4)] mb-3">
          OPENING MESSAGE PREVIEW
        </h3>
        <div className="bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.06)] rounded-[12px_12px_12px_2px] p-[14px_16px] shadow-lg">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-[32px] h-[32px] rounded-full overflow-hidden bg-gradient-to-br from-[#1a0a20] to-[#2d1040] border border-[#e8507a]/40 flex-shrink-0 flex items-center justify-center">
              {form.avatarPreview ? (
                <AvatarImage
                  src={form.avatarPreview}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="32px"
                />
              ) : (
                <span className="text-white/40 text-[9px] font-heading italic">AI</span>
              )}
            </div>
            <div>
              <div className="text-white text-[12px] font-semibold flex items-center gap-1.5 leading-none">
                {form.name || 'Name'}
                <span className="bg-[#e8507a]/15 text-[#e8507a] border border-[#e8507a]/30 text-[9px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider scale-90">
                  AI
                </span>
              </div>
              <div className="text-[rgba(255,255,255,0.4)] text-[10px] mt-0.5">Character</div>
            </div>
          </div>
          <p className="font-heading italic text-[14px] text-[rgba(255,255,255,0.7)] leading-[1.7] whitespace-pre-wrap break-words border-t border-white/5 pt-2">
            {form.greeting || (
              <span className="text-[rgba(255,255,255,0.3)]">
                Your opening message will appear here...
              </span>
            )}
          </p>
        </div>
      </div>
    </div>
  )
}
