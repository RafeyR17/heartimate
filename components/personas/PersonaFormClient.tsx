'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CameraIcon, Eye, X } from 'lucide-react'
import type { Persona } from '@/lib/personas'
import { AvatarImage } from '@/components/ui/avatar-image'
import { useToast } from '@/components/ToastProvider'
import { apiFetch } from '@/lib/api-client'

const DEFAULT_AVATAR =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%231a0e1c"/><circle cx="50" cy="35" r="20" fill="%23e8507a" opacity="0.4"/><path d="M20 80c0-15 15-25 30-25s30 10 30 25" fill="%23e8507a" opacity="0.4"/></svg>'

export interface PersonaFormValues {
  name: string
  short_bio: string
  appearance: string
  personality: string
  avatarFile: File | null
  avatarPreview: string
}

interface PersonaFormClientProps {
  mode: 'create' | 'edit'
  initial?: Persona | null
}

export default function PersonaFormClient({ mode, initial }: PersonaFormClientProps) {
  const router = useRouter()
  const { success } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState<PersonaFormValues>({
    name: initial?.name ?? '',
    short_bio: initial?.short_bio ?? '',
    appearance: initial?.appearance ?? '',
    personality: initial?.personality ?? '',
    avatarFile: null,
    avatarPreview: initial?.avatar_url ?? '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showMobilePreview, setShowMobilePreview] = useState(false)

  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(''), 3000)
      return () => clearTimeout(t)
    }
  }, [error])

  function update(field: keyof PersonaFormValues, value: unknown) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0]
      const url = URL.createObjectURL(file)
      setForm((prev) => ({ ...prev, avatarFile: file, avatarPreview: url }))
    }
  }

  const removeAvatar = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (form.avatarPreview.startsWith('blob:')) URL.revokeObjectURL(form.avatarPreview)
    setForm((prev) => ({ ...prev, avatarFile: null, avatarPreview: '' }))
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const isDisabled = !form.name.trim() || !form.appearance.trim() || !form.personality.trim()

  async function handleSubmit() {
    if (isDisabled) {
      setError('Name, appearance, and personality are required')
      return
    }

    setLoading(true)
    try {
      const formData = new FormData()
      if (form.avatarFile) formData.append('avatar', form.avatarFile)
      formData.append('name', form.name.trim())
      formData.append('short_bio', form.short_bio)
      formData.append('appearance', form.appearance)
      formData.append('personality', form.personality)
      if (!form.avatarFile && form.avatarPreview.startsWith('http')) {
        formData.append('avatarUrl', form.avatarPreview)
      }

      const url = mode === 'create' ? '/api/personas' : `/api/personas/${initial?.id}`
      const method = mode === 'create' ? 'POST' : 'PATCH'

      const result = await apiFetch(url, { method, body: formData })
      if (!result.ok) throw new Error(result.error || 'Failed to save persona')

      success(mode === 'create' ? 'Persona created' : 'Persona updated')
      router.push('/personas')
      router.refresh()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save persona'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const inputClass =
    'bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-[10px] p-[14px_16px] text-white font-body text-[14px] focus:border-[rgba(232,80,122,0.4)] focus:outline-none transition-all duration-200 placeholder:text-[rgba(255,255,255,0.25)] w-full'
  const labelClass =
    'font-label text-[11px] uppercase tracking-[0.15em] text-[rgba(255,255,255,0.4)] mb-[8px] block font-medium'
  const sectionHeadingClass =
    'font-heading italic text-[22px] text-[rgba(255,255,255,0.9)] border-b border-[rgba(255,255,255,0.06)] pb-[12px] mb-[24px]'

  const PreviewCard = () => (
    <div className="flex flex-col gap-6 w-full max-w-[320px] mx-auto md:mx-0">
      <p className="font-label text-[10px] uppercase tracking-[0.2em] text-white/40">
        In-chat preview
      </p>
      <div className="rounded-2xl border border-white/10 bg-[#0d0a0e] overflow-hidden shadow-2xl">
        <div className="p-5 flex items-center gap-3 border-b border-white/5 bg-[rgba(232,80,122,0.06)]">
          <div className="relative w-10 h-10 rounded-full overflow-hidden border border-[#e8507a]/40 flex-shrink-0">
            {form.avatarPreview ? (
              <AvatarImage src={form.avatarPreview} alt="" fill className="object-cover" sizes="40px" />
            ) : (
              <AvatarImage src={DEFAULT_AVATAR} alt="" fill className="object-cover opacity-60" sizes="40px" />
            )}
          </div>
          <div>
            <p className="text-[11px] text-white/40 uppercase tracking-wider">You are</p>
            <p className="font-semibold text-white text-[15px]">
              {form.name || 'Your Persona'}
            </p>
          </div>
          <span className="ml-auto text-[10px] text-[#e8507a] font-label uppercase">Persona</span>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-[12px] text-white/55 italic leading-relaxed">
            {form.short_bio || 'Your short bio appears here…'}
          </p>
          <div className="h-px bg-[rgba(232,80,122,0.2)]" />
          <p className="text-[11px] text-white/40 font-label uppercase tracking-wider">Appearance</p>
          <p className="text-[12px] text-white/65 leading-relaxed line-clamp-4">
            {form.appearance || 'Describe how you look…'}
          </p>
          <p className="text-[11px] text-white/40 font-label uppercase tracking-wider pt-2">
            Personality
          </p>
          <p className="text-[12px] text-white/65 leading-relaxed line-clamp-4">
            {form.personality || 'How you act and speak…'}
          </p>
        </div>
      </div>

      <div className="bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.06)] rounded-[12px_12px_12px_2px] p-4">
        <p className="text-[11px] text-white/35 mb-2 font-label uppercase">Sample user message</p>
        <p className="text-[13px] text-white/80 italic font-heading">
          *steps closer* {form.name ? `It's me — ${form.name.split(' ')[0]}.` : 'Hello…'}
        </p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#080608] text-white flex flex-col">
      {error && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-[#e8507a] text-white px-6 py-3 rounded-full text-sm shadow-2xl font-medium border border-white/10">
          {error}
        </div>
      )}

      <div className="fixed top-0 left-0 right-0 h-[60px] bg-[rgba(8,6,8,0.9)] backdrop-blur-[20px] border-b border-[rgba(255,255,255,0.06)] z-40 flex items-center justify-between px-6">
        <button
          type="button"
          onClick={() => router.back()}
          className="font-body text-[13px] text-[rgba(255,255,255,0.5)] hover:text-white transition-colors cursor-pointer"
        >
          ← Cancel
        </button>
        <h1 className="font-heading italic text-[18px] text-white">
          {mode === 'create' ? 'Create Persona' : 'Edit Persona'}
        </h1>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading || isDisabled}
          className={`bg-[#e8507a] text-white rounded-full px-5 py-1.5 text-[13px] font-semibold tracking-wide transition-all shadow-lg shadow-[#e8507a]/20 cursor-pointer ${
            loading || isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90 active:scale-95'
          }`}
        >
          {loading ? 'Saving…' : 'Save →'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[58%_42%] w-full min-h-screen pt-[60px]">
        <div className="p-[40px_24px] md:p-[80px_48px] flex flex-col gap-10">
          <div>
            <h2 className={sectionHeadingClass}>Identity</h2>

            <div className="flex flex-col items-center mb-8">
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`relative w-[120px] h-[120px] rounded-full flex flex-col items-center justify-center cursor-pointer transition-all duration-300 group ${
                  form.avatarPreview
                    ? 'border-2 border-[#e8507a] shadow-xl shadow-[#e8507a]/10'
                    : 'border-2 border-dashed border-[rgba(255,255,255,0.15)] bg-[rgba(255,255,255,0.03)] hover:border-[rgba(232,80,122,0.4)]'
                }`}
              >
                {form.avatarPreview ? (
                  <>
                    <AvatarImage
                      src={form.avatarPreview}
                      className="rounded-full object-cover"
                      alt="Avatar"
                      fill
                      sizes="120px"
                    />
                    <button
                      type="button"
                      onClick={removeAvatar}
                      className="absolute -top-1 -right-1 bg-[#e8507a] p-1.5 rounded-full text-white shadow-lg z-10"
                    >
                      <X size={12} />
                    </button>
                  </>
                ) : (
                  <>
                    <CameraIcon
                      size={24}
                      className="text-[rgba(255,255,255,0.4)] mb-1 group-hover:text-[#e8507a]"
                    />
                    <span className="text-[11px] text-[rgba(255,255,255,0.4)]">Upload photo</span>
                  </>
                )}
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleAvatarChange}
                accept="image/*"
                className="hidden"
              />
            </div>

            <div className="mb-6">
              <label className={labelClass}>Persona name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                placeholder='e.g. Damien Blackthorn, Luna Voss'
                className={inputClass}
              />
            </div>

            <div className="mb-6">
              <div className="flex justify-between items-end mb-[8px]">
                <label className={`${labelClass} mb-0`}>Short bio</label>
                <span className="text-[11px] text-white/40">{form.short_bio.length}/160</span>
              </div>
              <input
                type="text"
                maxLength={160}
                value={form.short_bio}
                onChange={(e) => update('short_bio', e.target.value)}
                placeholder="One or two lines — who are you at a glance?"
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <h2 className={sectionHeadingClass}>How you appear</h2>
            <div className="mb-6">
              <label className={labelClass}>Appearance</label>
              <p className="text-[11px] text-white/40 mb-2">
                Height, hair, clothing, vibe — be vivid.
              </p>
              <textarea
                maxLength={2000}
                value={form.appearance}
                onChange={(e) => update('appearance', e.target.value)}
                placeholder="Tall and lean with ink-black hair… Usually in dark tailored layers…"
                className={`${inputClass} min-h-[160px] resize-y`}
              />
            </div>
            <div>
              <label className={labelClass}>Personality</label>
              <p className="text-[11px] text-white/40 mb-2">
                Tone, traits, quirks, speech style.
              </p>
              <textarea
                maxLength={2000}
                value={form.personality}
                onChange={(e) => update('personality', e.target.value)}
                placeholder="Dry wit, fiercely loyal, speaks in short sentences when nervous…"
                className={`${inputClass} min-h-[160px] resize-y`}
              />
            </div>
          </div>
        </div>

        <div className="hidden md:block sticky top-[80px] h-[calc(100vh-80px)] overflow-y-auto p-[80px_48px_48px_24px] border-l border-white/[0.04]">
          <PreviewCard />
        </div>
      </div>

      <div className="md:hidden">
        {showMobilePreview ? (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowMobilePreview(false)}
            />
            <div className="fixed bottom-0 left-0 right-0 max-h-[85vh] z-50 bg-[#080608] border-t border-white/10 rounded-t-[24px] p-6 overflow-y-auto">
              <PreviewCard />
            </div>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setShowMobilePreview(true)}
            className="fixed bottom-6 right-6 z-40 bg-[#e8507a] text-white w-14 h-14 rounded-full shadow-2xl flex items-center justify-center cursor-pointer"
          >
            <Eye size={24} />
          </button>
        )}
      </div>
    </div>
  )
}
