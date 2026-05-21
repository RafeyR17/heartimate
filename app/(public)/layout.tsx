import { Suspense } from 'react'
import { auth } from '@clerk/nextjs/server'
import { AppShellFromAuth } from '@/components/AppShell'
import { PublicNav, publicGuestBottomInsetClass, publicNavTopInsetClass } from '@/components/PublicNav'
import { PublicNavShell } from '@/components/PublicNavShell'
import { MobileNavProvider } from '@/components/MobileNavProvider'
import { cn } from '@/lib/utils'

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { userId } = await auth()

  if (userId) {
    return <AppShellFromAuth>{children}</AppShellFromAuth>
  }

  return (
    <MobileNavProvider>
      <Suspense fallback={<PublicNavShell />}>
        <PublicNav />
      </Suspense>
      <div className={cn(publicNavTopInsetClass, publicGuestBottomInsetClass)}>{children}</div>
    </MobileNavProvider>
  )
}
