'use client'

import Link from 'next/link'

type Props = {
  open: boolean
  resetIn?: string
  upgradeHref?: string
  onClose: () => void
}

export function ChatQuotaExceededModal({
  open,
  resetIn,
  upgradeHref = '/settings',
  onClose,
}: Props) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center px-4 bg-black/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quota-modal-title"
    >
      <div className="w-full max-w-[420px] rounded-[20px] border border-[rgba(232,80,122,0.3)] bg-[#0d0a0e] p-8 text-center shadow-[0_24px_80px_rgba(0,0,0,0.6)]">
        <p className="text-[48px] leading-none mb-4" aria-hidden>
          🔒
        </p>
        <h2
          id="quota-modal-title"
          className="font-heading italic text-[28px] text-rose mb-3"
        >
          You&apos;ve reached your limit.
        </h2>
        <p className="font-body text-[14px] text-muted leading-relaxed mb-6">
          You&apos;ve used all 20 free messages today. Add your own API key for unlimited
          chats — it&apos;s completely free on OpenRouter.
        </p>
        <div className="h-px w-full bg-[rgba(232,80,122,0.25)] mb-6" />
        <Link
          href={upgradeHref}
          onClick={onClose}
          className="block w-full min-h-[44px] rounded-full bg-rose text-white font-body font-medium text-[13px] tracking-[0.08em] uppercase leading-[44px] hover:bg-rose/90 transition-colors"
        >
          Add Your API Key →
        </Link>
        <button
          type="button"
          onClick={onClose}
          className="mt-3 w-full min-h-[44px] rounded-full border border-white/15 text-white/60 font-body text-[13px] hover:text-white hover:border-white/25 transition-colors"
        >
          {resetIn ? `Come back tomorrow (resets in ${resetIn})` : 'Come back tomorrow'}
        </button>
        <p className="mt-5 font-body text-[11px] text-white/35 leading-relaxed">
          OpenRouter has free models with no credit card required.
        </p>
      </div>
    </div>
  )
}
