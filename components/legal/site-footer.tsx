import Link from 'next/link'
import { cn } from '@/lib/utils'

type SiteFooterProps = {
  className?: string
}

/** Terms + Privacy links — landing, public catalog, auth, and legal pages. */
export function SiteFooter({ className }: SiteFooterProps) {
  return (
    <footer
      className={cn(
        'border-t border-white/5 py-8 px-4 md:px-6 bg-card/50',
        className
      )}
    >
      <div className="max-w-7xl mx-auto flex flex-col items-center justify-center md:flex-row md:justify-between gap-6 text-center md:text-left">
        <Link
          href="/"
          className="font-heading italic text-xl tracking-wide text-white/80 hover:text-white order-1"
        >
          Heartimate<span className="text-rose">.</span>
        </Link>

        <nav
          className="flex flex-wrap items-center justify-center gap-4 md:gap-8 order-2"
          aria-label="Legal"
        >
          <Link
            href="/terms"
            className="font-body text-[13px] tracking-wide text-muted hover:text-white transition-colors"
          >
            Terms
          </Link>
          <Link
            href="/privacy"
            className="font-body text-[13px] tracking-wide text-muted hover:text-white transition-colors"
          >
            Privacy
          </Link>
        </nav>

        <span className="font-label text-[11px] font-medium text-muted uppercase tracking-[0.15em] order-3">
          © {new Date().getFullYear()} Heartimate · 18+ only
        </span>
      </div>
    </footer>
  )
}
