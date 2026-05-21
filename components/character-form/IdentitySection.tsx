'use client'

import { useRef } from 'react'
import { CameraIcon, ChevronDown, X } from 'lucide-react'
import { AvatarImage } from '@/components/ui/avatar-image'
import { AVAILABLE_TAGS } from './constants'
import { inputClass, labelClass, sectionHeadingClass } from './form-styles'
import type { CharacterFormState, CharacterFormUpdate } from './types'

type IdentitySectionProps = {
  form: CharacterFormState
  update: CharacterFormUpdate
  showGenderDropdown: boolean
  setShowGenderDropdown: (open: boolean) => void
  showTagDropdown: boolean
  setShowTagDropdown: (open: boolean) => void
  genderDropdownRef: React.RefObject<HTMLDivElement | null>
  dropdownRef: React.RefObject<HTMLDivElement | null>
  onAvatarChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onRemoveAvatar: (e: React.MouseEvent) => void
  onAddTag: (tag: string) => void
  onRemoveTag: (tag: string) => void
}

export function IdentitySection({
  form,
  update,
  showGenderDropdown,
  setShowGenderDropdown,
  showTagDropdown,
  setShowTagDropdown,
  genderDropdownRef,
  dropdownRef,
  onAvatarChange,
  onRemoveAvatar,
  onAddTag,
  onRemoveTag,
}: IdentitySectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  return (
    <div>
      <h2 className={sectionHeadingClass}>Identity</h2>

      <div className="flex flex-col items-center mb-8">
        <div
          onClick={() => fileInputRef.current?.click()}
          className={`w-[120px] h-[120px] rounded-full flex flex-col items-center justify-center cursor-pointer transition-all duration-300 group relative ${
            form.avatarPreview
              ? 'border-2 border-[#e8507a] shadow-xl shadow-[#e8507a]/10'
              : 'border-2 border-dashed border-[rgba(255,255,255,0.15)] bg-[rgba(255,255,255,0.03)] hover:border-[rgba(232,80,122,0.4)] hover:bg-[rgba(232,80,122,0.05)]'
          }`}
        >
          {form.avatarPreview ? (
            <>
              <AvatarImage
                src={form.avatarPreview}
                className="rounded-full object-cover"
                alt="Avatar"
                fill
                sizes="64px"
              />
              <button
                onClick={onRemoveAvatar}
                className="absolute -top-1 -right-1 bg-[#e8507a] hover:bg-rose-600 p-1.5 rounded-full text-white shadow-lg z-10 transition-transform hover:scale-110 border border-black/25"
              >
                <X size={12} />
              </button>
            </>
          ) : (
            <>
              <CameraIcon
                size={24}
                className="text-[rgba(255,255,255,0.4)] mb-1 group-hover:text-[#e8507a] transition-colors"
              />
              <span className="text-[11px] text-[rgba(255,255,255,0.4)] group-hover:text-[#e8507a] transition-colors font-medium">
                Upload photo
              </span>
            </>
          )}
        </div>
        <input
          type="file"
          ref={fileInputRef}
          onChange={onAvatarChange}
          accept="image/*"
          className="hidden"
        />
      </div>

      <div className="mb-6">
        <label className={labelClass}>CHARACTER NAME</label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => update('name', e.target.value)}
          placeholder="e.g. Lyra, The Shadow Witch"
          className={inputClass}
        />
      </div>

      <div className="mb-6">
        <div className="flex justify-between items-end mb-[8px]">
          <label className={`${labelClass} mb-0`}>SHORT DESCRIPTION</label>
          <span className="text-[11px] text-[rgba(255,255,255,0.4)] font-body font-medium">
            {form.description.length}/500
          </span>
        </div>
        <input
          type="text"
          maxLength={500}
          value={form.description}
          onChange={(e) => update('description', e.target.value)}
          placeholder="One line that makes people want to click..."
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="relative" ref={genderDropdownRef}>
          <label className={labelClass}>GENDER</label>
          <button
            type="button"
            onClick={() => setShowGenderDropdown(!showGenderDropdown)}
            className={`${inputClass} flex items-center justify-between cursor-pointer text-left w-full`}
            style={{
              borderColor: showGenderDropdown
                ? 'rgba(232,80,122,0.4)'
                : 'rgba(255,255,255,0.08)',
            }}
          >
            <span>{form.gender}</span>
            <ChevronDown
              className={`text-white/40 w-4 h-4 transition-transform duration-200 ${
                showGenderDropdown ? 'rotate-180 text-[#e8507a]' : ''
              }`}
            />
          </button>

          {showGenderDropdown && (
            <div className="absolute left-0 right-0 mt-2 bg-[#120d14] border border-[rgba(255,255,255,0.1)] rounded-[10px] py-1.5 z-30 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200">
              {['Female', 'Male', 'Non-binary', 'Other'].map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    update('gender', option)
                    setShowGenderDropdown(false)
                  }}
                  className={`w-full text-left px-4 py-2.5 text-sm font-body transition-colors ${
                    form.gender === option
                      ? 'bg-[#e8507a]/15 text-[#e8507a] font-medium'
                      : 'text-white/70 hover:bg-[#e8507a]/5 hover:text-[#e8507a]'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          )}
        </div>
        <div>
          <label className={labelClass}>AGE (APPARENT)</label>
          <input
            type="text"
            value={form.age}
            onChange={(e) => update('age', e.target.value)}
            placeholder="e.g. 24, Ancient, Unknown"
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-[10px] p-[16px] flex justify-between items-center transition-colors hover:border-[rgba(255,255,255,0.12)]">
          <div>
            <div className="font-label text-[10px] uppercase text-[#e8507a] font-bold tracking-widest flex items-center gap-1">
              ⚠️ MATURE CONTENT
            </div>
            <div className="text-[12px] text-[rgba(255,255,255,0.4)] mt-[4px]">
              Enable NSFW interactions
            </div>
          </div>
          <button
            onClick={() => update('isNsfw', !form.isNsfw)}
            className={`w-10 h-5 rounded-full relative transition-colors ${form.isNsfw ? 'bg-[#e8507a]' : 'bg-[rgba(255,255,255,0.2)]'}`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200 ${form.isNsfw ? 'translate-x-5' : 'translate-x-0'}`}
            />
          </button>
        </div>

        <div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-[10px] p-[16px] flex justify-between items-center transition-colors hover:border-[rgba(255,255,255,0.12)]">
          <div>
            <div className="font-label text-[10px] uppercase text-[rgba(255,255,255,0.4)] font-bold tracking-widest">
              VISIBILITY
            </div>
            <div className="text-[12px] text-[rgba(255,255,255,0.4)] mt-[4px]">Who can find this?</div>
          </div>
          <div className="flex bg-black/40 border border-white/5 rounded-[8px] p-0.5">
            <button
              onClick={() => update('isPublic', true)}
              className={`px-3 py-1 text-[11px] font-semibold rounded-[6px] transition-all ${
                form.isPublic
                  ? 'bg-[#e8507a] text-white shadow-md'
                  : 'text-[rgba(255,255,255,0.5)] hover:text-white'
              }`}
            >
              Public
            </button>
            <button
              onClick={() => update('isPublic', false)}
              className={`px-3 py-1 text-[11px] font-semibold rounded-[6px] transition-all ${
                !form.isPublic
                  ? 'bg-[#e8507a] text-white shadow-md'
                  : 'text-[rgba(255,255,255,0.5)] hover:text-white'
              }`}
            >
              Private
            </button>
          </div>
        </div>
      </div>

      <div className="relative">
        <div className="mb-2">
          <label className={`${labelClass} mb-1`}>TRAITS & TAGS</label>
          <div className="text-[11px] text-[rgba(255,255,255,0.4)]">Pick up to 8</div>
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          {form.tags.map((tag) => (
            <span
              key={tag}
              className="flex items-center gap-1.5 border border-[#e8507a] text-[#e8507a] bg-[#e8507a]/5 px-3 py-1 rounded-full text-[12px] font-medium transition-all hover:bg-[#e8507a]/10"
            >
              {tag}
              <button
                onClick={() => onRemoveTag(tag)}
                className="hover:text-white transition-colors p-0.5 rounded-full"
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>

        {form.tags.length >= 8 ? (
          <div className="text-[#e8507a] text-[12px] italic mt-2 font-medium">Max tags reached</div>
        ) : (
          <div ref={dropdownRef} className="relative inline-block">
            <button
              type="button"
              onClick={() => setShowTagDropdown(!showTagDropdown)}
              className="border border-dashed border-[rgba(255,255,255,0.2)] text-[rgba(255,255,255,0.6)] hover:border-[#e8507a] hover:text-[#e8507a] hover:bg-[#e8507a]/5 px-4 min-h-[44px] rounded-full text-[12px] font-semibold transition-all inline-flex items-center"
            >
              + Add Tag
            </button>

            {showTagDropdown && (
              <div className="absolute left-0 right-0 sm:right-auto mt-2 w-[min(480px,calc(100vw-1.5rem))] max-w-[calc(100vw-1.5rem)] sm:w-[480px] sm:max-w-[480px] bg-[#120d14] border border-[rgba(255,255,255,0.1)] rounded-[12px] p-4 z-30 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[12px] text-[rgba(255,255,255,0.5)] font-label uppercase tracking-widest font-bold">
                    Select Traits (Max 8)
                  </span>
                  <button
                    onClick={() => setShowTagDropdown(false)}
                    className="text-white/50 hover:text-white transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[220px] overflow-y-auto pr-1.5 custom-scrollbar">
                  {AVAILABLE_TAGS.map((tag) => {
                    const isSelected = form.tags.includes(tag)
                    return (
                      <button
                        key={tag}
                        onClick={() => !isSelected && onAddTag(tag)}
                        className={`px-3 min-h-[44px] rounded-full text-[11px] text-left font-medium transition-all inline-flex items-center ${
                          isSelected
                            ? 'bg-[#e8507a]/20 text-[#e8507a] border border-[#e8507a]/30 cursor-not-allowed'
                            : 'bg-white/5 text-white hover:bg-[#e8507a]/10 hover:text-[#e8507a] border border-white/5 hover:border-[#e8507a]/30'
                        }`}
                      >
                        {tag}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
