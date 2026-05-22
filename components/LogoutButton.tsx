'use client'

import { useClerk } from '@clerk/nextjs'
import { LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'

type LogoutButtonProps = {
  className?: string
  /** Called before sign-out (e.g. close mobile nav drawer). */
  onNavigate?: () => void
}

export function LogoutButton({ className, onNavigate }: LogoutButtonProps) {
  const { signOut } = useClerk()

  return (
    <button
      type="button"
      onClick={() => {
        onNavigate?.()
        void signOut({ redirectUrl: '/' })
      }}
      className={cn(
        'flex items-center gap-[10px] px-[12px] py-[10px] min-h-[44px] w-full rounded-lg font-body font-medium text-[13px] text-white/50 hover:bg-white/5 hover:text-white transition-all duration-200',
        className
      )}
    >
      <LogOut className="w-4 h-4 shrink-0" aria-hidden />
      Log out
    </button>
  )
}
