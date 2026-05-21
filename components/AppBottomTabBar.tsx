'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Compass, User } from 'lucide-react'
import { cn } from '@/lib/utils'

const TABS = [
  { label: 'Home', href: '/home', icon: Home, isActive: (p: string) => p === '/home' },
  {
    label: 'Explore',
    href: '/explore',
    icon: Compass,
    isActive: (p: string) => p === '/explore' || p.startsWith('/explore/'),
  },
  {
    label: 'Profile',
    href: '/profile',
    icon: User,
    isActive: (p: string) => p === '/profile' || p.startsWith('/profile/'),
  },
] as const

/** Routes with their own fixed mobile footer — hide app tab bar to avoid stacking. */
const HIDE_TAB_BAR = /^\/chat\/|\/characters\/[^/]+$/

/** Bottom inset when the app tab bar is visible (mobile only). */
export const appShellBottomInsetClass =
  'pb-[calc(3.75rem+env(safe-area-inset-bottom,0px))] md:pb-0'

export function shouldShowAppBottomTabBar(pathname: string): boolean {
  return !HIDE_TAB_BAR.test(pathname)
}

export function AppBottomTabBar() {
  const pathname = usePathname() ?? ''

  if (!shouldShowAppBottomTabBar(pathname)) return null

  return (
    <nav
      aria-label="App"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-[rgba(8,6,8,0.95)] backdrop-blur-xl safe-bottom"
    >
      <div className="flex items-stretch justify-around px-2 pt-1 pb-1">
        {TABS.map((tab) => {
          const Icon = tab.icon
          const active = tab.isActive(pathname)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'flex flex-1 flex-col items-center justify-center gap-0.5 min-h-[44px] min-w-0 px-2 rounded-lg font-body text-[11px] font-medium uppercase tracking-wide transition-colors',
                active ? 'text-rose' : 'text-white/50 hover:text-white'
              )}
            >
              <Icon className={cn('w-5 h-5 shrink-0', active && 'text-rose')} aria-hidden />
              <span className="truncate">{tab.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
