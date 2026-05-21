import Link from 'next/link'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type EmptyStateAction = {
  label: string
  href?: string
  onClick?: () => void
}

type EmptyStateProps = {
  icon: ReactNode
  title: string
  subtitle: string
  action?: EmptyStateAction
  compact?: boolean
  className?: string
}

export function EmptyState({
  icon,
  title,
  subtitle,
  action,
  compact = false,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center px-5 text-center',
        compact ? 'py-8' : 'py-[60px]',
        className
      )}
    >
      <div
        className="flex h-[60px] w-[60px] items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] text-white/50"
        aria-hidden
      >
        <span className="flex h-7 w-7 items-center justify-center [&_svg]:h-7 [&_svg]:w-7">
          {icon}
        </span>
      </div>
      <h3 className="mt-4 font-body text-[16px] font-semibold text-white">{title}</h3>
      <p className="mt-1 max-w-[320px] font-body text-[14px] leading-relaxed text-muted-on-dark">
        {subtitle}
      </p>
      {action &&
        (action.href ? (
          <Link href={action.href} className="btn-primary mt-6">
            {action.label}
          </Link>
        ) : (
          <button type="button" onClick={action.onClick} className="btn-primary mt-6">
            {action.label}
          </button>
        ))}
    </div>
  )
}
