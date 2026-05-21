import { redirect } from 'next/navigation'
import ChatClient from './ChatClientDynamic'


import { requireAuthedServerDb } from '@/lib/server-auth'
import { fetchChatPageBundle } from '@/lib/chat-page-data'

export default async function ChatPage({
  params
}: {
  params: Promise<{ chatId: string }>
}) {
  const { chatId } = await params
  const { supabase, user } = await requireAuthedServerDb()

  const bundle = await fetchChatPageBundle(supabase, chatId, user.id)
  if (!bundle) redirect('/home')

  return (
    <ChatClient
      chatId={chatId}
      character={bundle.character}
      persona={bundle.persona}
      initialMessages={bundle.initialMessages}
      initialHasMore={bundle.initialHasMore}
      initialOlderCursor={bundle.initialOlderCursor}
      initialTitle={bundle.initialTitle}
      userDisplayName={user.display_name ?? 'User'}
      initialAffectionScore={bundle.initialAffectionScore}
      initialRelationshipLevel={bundle.initialRelationshipLevel}
    />
  )
}
