'use client'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, type FormEvent } from 'react'
import { Menu, Search, X, Compass, LogIn, UserPlus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { iconTouchClass, primaryCtaTouchClass } from '@/lib/touch-targets'
import { useMobileNav } from '@/components/MobileNavProvider'

const CHARACTER_DETAIL_PATH = /^\/characters\/[^/]+$/

type NavItem = { label: string; href: string; active: boolean; icon?: React.ComponentType<{ className?: string }> }

function PublicMobileDrawer({
  open,
  onClose,
  logoHref,
  links,
}: {
  open: boolean
  onClose: () => void
  logoHref: string
  links: NavItem[]
}) {
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  return (
    <>
      <button
        type="button"
        aria-label="Close menu"
        aria-hidden={!open}
        tabIndex={open ? 0 : -1}
        onClick={onClose}
        className={cn(
          'md:hidden fixed inset-0 z-[55] bg-black/60 backdrop-blur-sm transition-opacity duration-300',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
      />
      <aside
        id="public-mobile-nav-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        aria-hidden={!open}
        className={cn(
          'md:hidden fixed top-0 left-0 bottom-0 z-[56] w-[min(280px,85vw)] border-r border-white/10 shadow-2xl transition-transform duration-300 ease-out bg-[#0d0a0e]',
          open ? 'translate-x-0' : '-translate-x-full pointer-events-none'
        )}
      >
        <div className="flex flex-col h-full">
          <div className="py-5 px-5 border-b border-white/5 flex items-center justify-between shrink-0 safe-top">
            <Link href={logoHref} className="font-heading italic text-[18px] text-white" onClick={onClose}>
              Heartimate<span className="text-rose">.</span>
            </Link>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close menu"
              className={cn(iconTouchClass, 'text-white/50 hover:text-white hover:bg-white/5')}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-1">
            {links.map((link) => {
              const Icon = link.icon
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={onClose}
                  className={cn(
                    'group flex items-center gap-[10px] px-3 py-2.5 min-h-[44px] rounded-lg font-body font-medium text-[13px] transition-all border-l-2',
                    link.active
                      ? 'bg-[rgba(232,80,122,0.12)] text-rose border-rose'
                      : 'text-white/50 hover:bg-white/5 hover:text-white border-transparent'
                  )}
                >
                  {Icon && (
                    <Icon
                      className={cn(
                        'w-4 h-4 shrink-0',
                        link.active ? 'text-rose' : 'text-white/50 group-hover:text-white'
                      )}
                    />
                  )}
                  {link.label}
                </Link>
              )
            })}
          </nav>

          <div className="border-t border-white/5 p-4 shrink-0 safe-bottom">
            <Link
              href="/signup"
              onClick={onClose}
              className={`btn-primary w-full ${primaryCtaTouchClass} uppercase tracking-wider text-[13px]`}
            >
              Enter Free
            </Link>
          </div>
        </div>
      </aside>
    </>
  )
}

function PublicGuestBottomBar({ pathname }: { pathname: string }) {
  const items = [
    { label: 'Explore', href: '/explore', active: pathname === '/explore', icon: Compass },
    { label: 'Log in', href: '/login', active: pathname === '/login', icon: LogIn },
    { label: 'Sign up', href: '/signup', active: pathname === '/signup', icon: UserPlus },
  ] as const

  return (
    <nav
      aria-label="Primary"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-[rgba(8,6,8,0.95)] backdrop-blur-xl safe-bottom"
    >
      <div className="flex items-stretch justify-around px-2 pt-1 pb-1">
        {items.map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-1 flex-col items-center justify-center gap-0.5 min-h-[44px] min-w-0 px-2 rounded-lg font-body text-[11px] font-medium uppercase tracking-wide transition-colors',
                item.active ? 'text-rose' : 'text-white/50 hover:text-white'
              )}
            >
              <Icon className={cn('w-5 h-5 shrink-0', item.active && 'text-rose')} aria-hidden />
              <span className="truncate">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

/** Guest-only marketing/catalog chrome (signed-in public routes use AppShell). */
export function PublicNav() {
  const pathname = usePathname() ?? ''
  const router = useRouter()
  const searchParams = useSearchParams()
  const { open, toggle, close } = useMobileNav()
  const [searchQuery, setSearchQuery] = useState('')

  const logoHref = '/'
  const isCharacterDetail = CHARACTER_DETAIL_PATH.test(pathname)
  const showGuestBottomBar = !isCharacterDetail
  const showMobileExploreSearch = pathname === '/explore'

  const desktopLinks: NavItem[] = [
    { label: 'Explore', href: '/explore', active: pathname === '/explore', icon: Compass },
    { label: 'Log in', href: '/login', active: pathname === '/login', icon: LogIn },
  ]

  const drawerLinks: NavItem[] = [
    { label: 'Explore', href: '/explore', active: pathname === '/explore', icon: Compass },
    { label: 'Log in', href: '/login', active: pathname === '/login', icon: LogIn },
    { label: 'Sign up', href: '/signup', active: pathname === '/signup', icon: UserPlus },
  ]

  useEffect(() => {
    close()
  }, [pathname, close])

  const [mobileSearchSynced, setMobileSearchSynced] = useState(false)
  if (showMobileExploreSearch && !mobileSearchSynced) {
    setMobileSearchSynced(true)
    setSearchQuery(searchParams.get('q') ?? '')
  }
  if (!showMobileExploreSearch && mobileSearchSynced) {
    setMobileSearchSynced(false)
  }

  const handleSearch = (e: FormEvent) => {
    e.preventDefault()
    const q = searchQuery.trim()
    if (q) router.push(`/explore?q=${encodeURIComponent(q)}`)
    else router.push('/explore')
  }

  return (
    <>
      <nav className="fixed top-0 w-full z-50 safe-top bg-gradient-to-b from-bg/90 to-transparent backdrop-blur-sm border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-14 md:h-20 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 md:gap-0 min-w-0 shrink-0">
            <button
              type="button"
              onClick={toggle}
              aria-label="Open menu"
              aria-controls="public-mobile-nav-drawer"
              className={cn(iconTouchClass, 'md:hidden text-white/70 hover:text-white hover:bg-white/5 -ml-2')}
            >
              <Menu className="w-6 h-6" />
            </button>
            <Link
              href={logoHref}
              className={cn(
                'font-heading italic text-base md:text-3xl tracking-wide text-white shrink-0',
                showMobileExploreSearch && 'hidden sm:inline'
              )}
            >
              Heartimate<span className="text-rose">.</span>
            </Link>
          </div>

          {showMobileExploreSearch && (
            <form onSubmit={handleSearch} className="md:hidden flex-1 relative min-w-0 max-w-none">
              <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                placeholder="Search characters..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-full h-11 pr-4 pl-10 font-body text-base text-white placeholder:text-white/30 focus:outline-none focus:border-[rgba(232,80,122,0.3)] transition-colors"
              />
            </form>
          )}

          <div className="hidden md:flex items-center gap-8">
            {desktopLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'font-body text-[13px] tracking-[0.1em] uppercase transition-colors',
                  link.active ? 'text-rose' : 'text-muted hover:text-white'
                )}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/signup"
              className={`btn-primary ${primaryCtaTouchClass} uppercase tracking-wider text-[13px] px-6 py-2.5`}
            >
              Enter Free
            </Link>
          </div>

          <div className="md:hidden w-0 shrink-0" aria-hidden />
        </div>
      </nav>

      <PublicMobileDrawer open={open} onClose={close} logoHref={logoHref} links={drawerLinks} />

      {showGuestBottomBar && <PublicGuestBottomBar pathname={pathname} />}
    </>
  )
}

/** Offset below fixed PublicNav on guest public routes (mobile + desktop). */
export const publicNavTopInsetClass = 'pt-14 md:pt-20'

/** Bottom inset for guest public pages with the tab bar (md+ unchanged). */
export const publicGuestBottomInsetClass =
  'pb-[calc(3.75rem+env(safe-area-inset-bottom,0px))] md:pb-0'
