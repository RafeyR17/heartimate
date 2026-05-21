import { auth } from '@clerk/nextjs/server'
import { createAuthedDb } from '@/lib/authed-db'
import { fetchSidebarContext } from '@/lib/sidebar-context'
import type { SidebarChatItem } from '@/lib/app-types'

export type AppShellSidebarProps = {
  displayName: string
  avatarUrl: string | null
  chats: SidebarChatItem[]
  streakCount: number
}

/** Sidebar data for authenticated app / signed-in public shell. */
export async function resolveAppShellSidebar(): Promise<AppShellSidebarProps | null> {
  const { userId } = await auth()
  if (!userId) return null

  let displayName = ''
  let avatarUrl: string | null = null
  let chats: SidebarChatItem[] = []
  let streakCount = 0

  const authed = await createAuthedDb()
  if (authed) {
    const sidebar = await fetchSidebarContext(authed.supabase, authed.user.id)
    if (sidebar) {
      displayName = sidebar.displayName
      avatarUrl = sidebar.avatarUrl
      streakCount = sidebar.streakCount
      chats = sidebar.chats
    } else {
      displayName = authed.user.display_name ?? ''
      avatarUrl = authed.user.avatar_url ?? null
    }
  }

  return { displayName, avatarUrl, chats, streakCount }
}
