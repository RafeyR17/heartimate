import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Apply to each slide/link inside HorizontalCarousel. */
export const carouselSnapItemClass = 'snap-start shrink-0'

type HorizontalCarouselProps = {
  children: ReactNode
  className?: string
  trackClassName?: string
  ariaLabel?: string
  /** Edge gradients hint that content scrolls (hidden md+ when track is full width). */
  fadeEdges?: boolean
  fadeFrom?: string
}

/**
 * Horizontal scroll row with snap, peek padding, and optional fade edges.
 */
export function HorizontalCarousel({
  children,
  className,
  trackClassName,
  ariaLabel,
  fadeEdges = true,
  fadeFrom = 'var(--bg)',
}: HorizontalCarouselProps) {
  return (
    <div className={cn('relative min-w-0', className)}>
      {fadeEdges && (
        <>
          <div
            aria-hidden
            className="pointer-events-none absolute left-0 top-0 bottom-0 w-5 z-[1] md:hidden"
            style={{ background: `linear-gradient(to right, ${fadeFrom}, transparent)` }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 z-[1] md:hidden"
            style={{ background: `linear-gradient(to left, ${fadeFrom}, transparent)` }}
          />
        </>
      )}
      <div
        {...(ariaLabel
          ? { role: 'region' as const, 'aria-label': ariaLabel }
          : {})}
        className={cn(
          'flex overflow-x-auto scroll-smooth snap-x snap-mandatory scrollbar-hide',
          'gap-3 ps-0.5 pe-6 scroll-ps-4',
          '[scrollbar-width:none] [-ms-overflow-style:none]',
          trackClassName
        )}
      >
        {children}
      </div>
    </div>
  )
}
