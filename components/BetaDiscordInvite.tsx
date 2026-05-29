'use client'

import { MessageCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

type BetaDiscordInviteProps = {
  className?: string
}

export default function BetaDiscordInvite({ className }: BetaDiscordInviteProps) {
  return (
    <div
      className={cn(
        'mx-4 mt-8 bg-[#1a1520] border border-[#e8507a]/30 rounded-2xl p-6',
        className
      )}
    >
      <div className="flex flex-col gap-3 min-[360px]:flex-row min-[360px]:items-start min-[360px]:gap-4">
        <div className="w-11 h-11 rounded-2xl bg-[#e8507a]/10 flex items-center justify-center flex-shrink-0">
          <MessageCircle className="text-[#e8507a]" size={24} />
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-base sm:text-lg leading-tight">Join Heartimate Beta Discord</p>
          <p className="text-sm text-zinc-400 mt-2 leading-snug">
            You&apos;re one of the first users. Help us fix bugs and decide new features.
          </p>

          <a
            href="https://discord.gg/jbrQzfqcx"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 block w-full bg-[#e8507a] hover:bg-[#d43d68] text-center py-3.5 rounded-xl font-medium transition-all active:scale-[0.985]"
          >
            Join Beta Discord →
          </a>
        </div>
      </div>
    </div>
  )
}
