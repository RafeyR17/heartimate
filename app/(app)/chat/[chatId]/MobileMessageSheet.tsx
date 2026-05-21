'use client'

import { useAccessibleDialog } from '@/lib/use-accessible-dialog'
import { type Message, isUserRole } from './chat-types'

interface MobileMessageSheetProps {
  msg: Message
  messages: Message[]
  isStreaming: boolean
  onClose: () => void
  onCopy: () => void
  onEdit: () => void
  onDelete: () => void
  onRegenerate: () => void
}

const actionClass =
  'flex w-full items-center min-h-[48px] px-1 text-[15px] text-left border-b border-white/5 active:bg-white/5'

export default function MobileMessageSheet({
  msg,
  messages,
  isStreaming,
  onClose,
  onCopy,
  onEdit,
  onDelete,
  onRegenerate,
}: MobileMessageSheetProps) {
  const { dialogRef, titleId } = useAccessibleDialog(true, onClose)
  const isUser = isUserRole(msg.role)
  const isLastAssistant = !isUser && messages[messages.length - 1]?.id === msg.id
  const showRegenerate = isLastAssistant && !isStreaming

  return (
    <div className="fixed inset-0 z-[120] md:hidden flex items-end bg-black/60">
      <button
        type="button"
        className="absolute inset-0 w-full h-full cursor-default"
        aria-label="Close message actions"
        onClick={onClose}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full bg-[#120d14] border-t border-white/10 rounded-t-2xl px-4 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))] outline-none max-h-[min(70dvh,520px)] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20" aria-hidden />

        <h2 id={titleId} className="sr-only">
          Message actions
        </h2>

        {showRegenerate && (
          <button type="button" className={`${actionClass} text-[#e8507a] font-medium`} onClick={onRegenerate}>
            Regenerate response
          </button>
        )}

        <button type="button" className={actionClass} onClick={onCopy}>
          Copy
        </button>

        {isUser && (
          <button type="button" className={actionClass} onClick={onEdit}>
            Edit
          </button>
        )}

        <button type="button" className={`${actionClass} text-red-400`} onClick={onDelete}>
          Delete
        </button>

        <button
          type="button"
          className="flex w-full items-center justify-center min-h-[48px] mt-2 text-[15px] text-white/70 rounded-xl bg-white/5 active:bg-white/10"
          onClick={onClose}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
