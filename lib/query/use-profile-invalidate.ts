'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useCallback } from 'react'
import { queryKeys } from '@/lib/query/keys'

/** After profile mutations: invalidate client cache and resync RSC props. */
export function useProfileInvalidate() {
  const queryClient = useQueryClient()
  const router = useRouter()

  return useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.profile.all })
    router.refresh()
  }, [queryClient, router])
}
