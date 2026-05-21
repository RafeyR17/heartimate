import { SidebarClient } from '@/components/SidebarClient'
import { ContentWrapper } from '@/components/ContentWrapper'
import { MobileNavProvider } from '@/components/MobileNavProvider'
import { ClerkProviders } from '@/components/ClerkProviders'
import { AppShellTransition } from '@/components/AppShellTransition'
import { resolveAppShellSidebar, type AppShellSidebarProps } from '@/lib/app-shell-sidebar'

export function AppShell({
  sidebar,
  children,
}: {
  sidebar: AppShellSidebarProps
  children: React.ReactNode
}) {
  return (
    <ClerkProviders>
      <MobileNavProvider>
        <AppShellTransition>
          <SidebarClient
            displayName={sidebar.displayName}
            avatarUrl={sidebar.avatarUrl}
            chats={sidebar.chats}
            streakCount={sidebar.streakCount}
          />
          <ContentWrapper>{children}</ContentWrapper>
        </AppShellTransition>
      </MobileNavProvider>
    </ClerkProviders>
  )
}

export async function AppShellFromAuth({ children }: { children: React.ReactNode }) {
  const sidebar = await resolveAppShellSidebar()
  if (!sidebar) {
    return <>{children}</>
  }
  return <AppShell sidebar={sidebar}>{children}</AppShell>
}
