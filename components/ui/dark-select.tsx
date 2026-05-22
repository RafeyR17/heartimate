'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export type DarkSelectOption = {
  value: string
  label: string
}

type DarkSelectProps = {
  value: string
  onChange: (value: string) => void
  options: readonly DarkSelectOption[]
  'aria-label': string
  className?: string
  triggerClassName?: string
  /** Align dropdown panel to trigger edge (default right). */
  menuAlign?: 'left' | 'right'
}

export function DarkSelect({
  value,
  onChange,
  options,
  'aria-label': ariaLabel,
  className,
  triggerClassName,
  menuAlign = 'right',
}: DarkSelectProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const listboxId = useId()

  const selected = options.find((o) => o.value === value) ?? options[0]

  useEffect(() => {
    if (!open) return
    function onPointerDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          'flex min-h-[44px] w-full items-center justify-between gap-2 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 font-body text-[13px] text-white transition-colors',
          'hover:border-white/15 focus:outline-none focus:border-[rgba(232,80,122,0.3)]',
          open && 'border-[rgba(232,80,122,0.3)]',
          triggerClassName
        )}
      >
        <span className="truncate">{selected?.label}</span>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-white/45 transition-transform duration-200',
            open && 'rotate-180'
          )}
          aria-hidden
        />
      </button>

      {open && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label={ariaLabel}
          className={cn(
            'absolute z-50 mt-1 min-w-full overflow-hidden rounded-lg border border-white/10 bg-[#1a1520] py-1 shadow-[0_12px_40px_rgba(0,0,0,0.55)]',
            menuAlign === 'right' ? 'right-0' : 'left-0'
          )}
        >
          {options.map((opt) => {
            const isSelected = opt.value === value
            return (
              <li key={opt.value} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange(opt.value)
                    setOpen(false)
                  }}
                  className={cn(
                    'flex w-full min-h-[44px] items-center justify-between gap-2 px-3 py-2.5 font-body text-[13px] text-left transition-colors',
                    isSelected
                      ? 'bg-[rgba(232,80,122,0.15)] text-rose'
                      : 'text-white/80 hover:bg-white/[0.06] hover:text-white'
                  )}
                >
                  <span>{opt.label}</span>
                  {isSelected && <Check className="h-4 w-4 shrink-0 text-rose" aria-hidden />}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
