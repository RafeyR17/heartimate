'use client'

import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { iconTouchClass } from '@/lib/touch-targets'
import { useAccessibleDialog } from '@/lib/use-accessible-dialog'

type AccessibleDialogProps = {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  disabled?: boolean
  className?: string
  panelClassName?: string
  /** bottom sheet on mobile */
  mobileSheet?: boolean
  /** Show title visually (still used for aria-labelledby) */
  visibleTitle?: boolean
  /** Show an X close control in the panel corner */
  showCloseButton?: boolean
}

export function AccessibleDialog({
  open,
  onClose,
  title,
  children,
  disabled = false,
  className,
  panelClassName,
  mobileSheet = false,
  visibleTitle = false,
  showCloseButton = false,
}: AccessibleDialogProps) {
  const { dialogRef, titleId } = useAccessibleDialog(open, onClose, { disabled })

  if (!open) return null

  return (
    <div
      className={cn(
        'fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4',
        className
      )}
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        aria-label="Close dialog"
        onClick={() => !disabled && onClose()}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'relative w-full bg-[#120d14] border border-white/10 shadow-2xl outline-none max-h-[85dvh] overflow-y-auto',
          'rounded-t-[20px] sm:rounded-xl sm:max-w-md p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]',
          !mobileSheet && 'sm:max-w-sm',
          panelClassName
        )}
      >
        {showCloseButton && (
          <button
            type="button"
            onClick={() => !disabled && onClose()}
            disabled={disabled}
            aria-label="Close dialog"
            className={`absolute top-2 right-2 ${iconTouchClass} text-white/50 hover:text-white hover:bg-white/10 z-10`}
          >
            <X className="w-5 h-5" />
          </button>
        )}
        <h2
          id={titleId}
          className={visibleTitle ? 'text-[14px] font-semibold text-white mb-3 pr-10' : 'sr-only'}
        >
          {title}
        </h2>
        {children}
      </div>
    </div>
  )
}
