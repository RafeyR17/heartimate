'use client'

type CharacterFormHeaderProps = {
  mode: 'create' | 'edit'
  characterId?: string
  forkedFrom: { id: string; name: string } | null
  loading: boolean
  isPublishDisabled: boolean
  onSubmit: () => void
  onCancel: () => void
}

export function CharacterFormHeader({
  mode,
  forkedFrom,
  loading,
  isPublishDisabled,
  onSubmit,
  onCancel,
}: CharacterFormHeaderProps) {
  return (
    <div className="fixed top-0 left-0 right-0 h-[60px] bg-[rgba(8,6,8,0.9)] backdrop-blur-[20px] border-b border-[rgba(255,255,255,0.06)] z-40 flex items-center justify-between px-6">
      <button
        type="button"
        onClick={onCancel}
        className="font-body text-[13px] text-[rgba(255,255,255,0.5)] hover:text-white transition-colors min-h-[44px] min-w-[44px] px-2 flex items-center justify-start"
      >
        ← Cancel
      </button>
      <h1 className="font-heading italic text-[18px] text-white select-none">
        {mode === 'edit'
          ? 'Edit Character'
          : forkedFrom
            ? 'Fork Character'
            : 'Create Character'}
      </h1>
      <button
        type="button"
        onClick={onSubmit}
        disabled={loading || isPublishDisabled}
        className={`bg-[#e8507a] text-white rounded-full px-5 py-1.5 text-[13px] font-semibold tracking-wide transition-all shadow-lg shadow-[#e8507a]/20 ${
          loading || isPublishDisabled
            ? 'opacity-50 cursor-not-allowed'
            : 'hover:opacity-90 active:scale-95'
        }`}
      >
        {loading ? 'Saving...' : mode === 'edit' ? 'Save Changes →' : 'Publish →'}
      </button>
    </div>
  )
}
