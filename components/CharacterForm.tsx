'use client'

import Link from 'next/link'
import { CharacterFormHeader } from '@/components/character-form/CharacterFormHeader'
import { CharacterFormMobilePreview } from '@/components/character-form/CharacterFormMobilePreview'
import { CharacterFormPreview } from '@/components/character-form/CharacterFormPreview'
import { characterFormScrollbarCss } from '@/components/character-form/form-styles'
import { IdentitySection } from '@/components/character-form/IdentitySection'
import { SoulSection } from '@/components/character-form/SoulSection'
import { useCharacterForm } from '@/components/character-form/use-character-form'
import type { CharacterFormProps } from '@/components/character-form/types'

export type { CharacterFormInitial } from '@/components/character-form/types'

export function CharacterForm({
  mode = 'create',
  characterId,
  initialCharacter = null,
}: CharacterFormProps) {
  const {
    forkedFrom,
    form,
    loading,
    showTagDropdown,
    setShowTagDropdown,
    showGenderDropdown,
    setShowGenderDropdown,
    showMobilePreview,
    setShowMobilePreview,
    dropdownRef,
    genderDropdownRef,
    update,
    handleAvatarChange,
    setAvatarFromGeneratedUrl,
    removeAvatar,
    addTag,
    removeTag,
    addExample,
    removeExample,
    updateExample,
    isPublishDisabled,
    handleSubmit,
    handleCancel,
  } = useCharacterForm({ mode, characterId, initialCharacter })

  return (
    <div className="min-h-[100dvh] bg-[#080608] text-white flex flex-col overflow-x-hidden">
      <CharacterFormHeader
        mode={mode}
        characterId={characterId}
        forkedFrom={forkedFrom}
        loading={loading}
        isPublishDisabled={isPublishDisabled}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
      />

      <div className="grid grid-cols-1 md:grid-cols-[58%_42%] w-full min-h-0 flex-1 pt-[60px] overflow-x-hidden">
        <div className="p-4 md:p-[40px_24px] lg:p-[80px_48px_80px_48px] w-full max-w-none flex flex-col gap-8 md:gap-12 overflow-y-auto overflow-x-hidden pb-[calc(80px+env(safe-area-inset-bottom,0px))] md:pb-[80px]">
          {forkedFrom && (
            <div className="flex items-center gap-2 rounded-xl border border-rose/30 bg-rose/10 px-4 py-3 text-sm text-rose">
              <span className="font-label text-[10px] uppercase tracking-wider font-bold">
                Forked from
              </span>
              <Link href={`/characters/${forkedFrom.id}`} className="font-semibold hover:underline">
                {forkedFrom.name}
              </Link>
            </div>
          )}

          <IdentitySection
            form={form}
            update={update}
            showGenderDropdown={showGenderDropdown}
            setShowGenderDropdown={setShowGenderDropdown}
            showTagDropdown={showTagDropdown}
            setShowTagDropdown={setShowTagDropdown}
            genderDropdownRef={genderDropdownRef}
            dropdownRef={dropdownRef}
            onAvatarChange={handleAvatarChange}
            onRemoveAvatar={removeAvatar}
            onAvatarGenerated={setAvatarFromGeneratedUrl}
            onAddTag={addTag}
            onRemoveTag={removeTag}
          />

          <SoulSection
            form={form}
            update={update}
            addExample={addExample}
            removeExample={removeExample}
            updateExample={updateExample}
          />
        </div>

        <div className="hidden md:block sticky top-[80px] h-[calc(100vh-80px)] overflow-y-auto p-[80px_48px_48px_24px] border-l border-[rgba(255,255,255,0.04)] custom-scrollbar">
          <CharacterFormPreview form={form} />
        </div>
      </div>

      <CharacterFormMobilePreview
        form={form}
        showMobilePreview={showMobilePreview}
        setShowMobilePreview={setShowMobilePreview}
      />

      <style dangerouslySetInnerHTML={{ __html: characterFormScrollbarCss }} />
    </div>
  )
}
