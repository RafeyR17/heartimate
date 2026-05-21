'use client'

import { Eye, X } from 'lucide-react'
import { useAccessibleDialog } from '@/lib/use-accessible-dialog'
import { iconTouchClass } from '@/lib/touch-targets'
import { CharacterFormPreview } from './CharacterFormPreview'
import type { CharacterFormState } from './types'

type CharacterFormMobilePreviewProps = {
  form: CharacterFormState
  showMobilePreview: boolean
  setShowMobilePreview: (open: boolean) => void
}

export function CharacterFormMobilePreview({
  form,
  showMobilePreview,
  setShowMobilePreview,
}: CharacterFormMobilePreviewProps) {
  const close = () => setShowMobilePreview(false)
  const { dialogRef, titleId } = useAccessibleDialog(showMobilePreview, close)

  return (
    <div className="md:hidden">
      {showMobilePreview ? (
        <>
          <button
            type="button"
            aria-label="Close preview"
            onClick={close}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
          />
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="fixed bottom-0 left-0 right-0 max-h-[85dvh] z-50 bg-[#080608] border-t border-white/10 rounded-t-[24px] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-300 outline-none pb-[env(safe-area-inset-bottom)]"
          >
            <div
              className="w-full flex justify-center py-3 flex-shrink-0 cursor-pointer min-h-[44px]"
              onClick={close}
              role="presentation"
            >
              <div className="w-12 h-1 bg-white/10 rounded-full hover:bg-white/20 transition-colors" />
            </div>

            <div className="flex justify-between items-center px-6 pb-4 border-b border-white/5">
              <h2 id={titleId} className="font-heading italic text-lg text-white">
                Live Preview
              </h2>
              <button
                type="button"
                onClick={close}
                aria-label="Close preview"
                className={`${iconTouchClass} bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-full transition-all`}
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 pb-20 custom-scrollbar">
              <CharacterFormPreview form={form} />
            </div>
          </div>
        </>
      ) : (
        <button
          type="button"
          onClick={() => setShowMobilePreview(true)}
          aria-label="Open live preview"
          className="fixed bottom-6 right-4 z-40 bg-[#e8507a] text-white w-[52px] h-[52px] rounded-full shadow-2xl shadow-[#e8507a]/40 flex items-center justify-center transition-all hover:scale-105 active:scale-95 border border-white/10 touch-target"
          style={{ animation: 'bounceSubtle 3s infinite ease-in-out' }}
        >
          <Eye size={24} />
        </button>
      )}
    </div>
  )
}
