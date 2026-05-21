'use client'

import dynamic from 'next/dynamic'

const ProfileClient = dynamic(() => import('./ProfileClient'), {
  loading: () => (
    <div className="min-h-[40vh] bg-[#080608] animate-pulse rounded-2xl" />
  ),
})

export default ProfileClient
