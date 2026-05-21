'use client'

import { useEffect, useState } from 'react'

export function useCharacterToast() {
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2500)
    return () => clearTimeout(t)
  }, [toast])

  return { toast, showToast: setToast }
}
