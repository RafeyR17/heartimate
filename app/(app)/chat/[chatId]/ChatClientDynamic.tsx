'use client'

import dynamic from 'next/dynamic'

const ChatClient = dynamic(() => import('./ChatClient'), {
  loading: () => (
    <div className="min-h-[100dvh] bg-[#080608] flex items-center justify-center">
      <p className="font-body text-sm text-white/40">Loading chat…</p>
    </div>
  ),
})

export default ChatClient
