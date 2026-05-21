'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { AlertTriangle, Check, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ToastTone = 'success' | 'error' | 'info' | 'warning'

type ToastItem = {
  id: string
  tone: ToastTone
  title: string
  message?: string
  exiting?: boolean
}

type ToastApi = {
  success: (title: string, message?: string) => void
  error: (title: string, message?: string) => void
  info: (title: string, message?: string) => void
  warning: (title: string, message?: string) => void
  /** @deprecated use success/error/info/warning */
  toast: (message: string, type?: 'success' | 'error' | 'info') => void
}

const ToastContext = createContext<ToastApi | null>(null)

const TONE_STYLES: Record<
  ToastTone,
  { border: string; icon: ReactNode; iconClass: string }
> = {
  success: {
    border: '#22c55e',
    iconClass: 'text-green-400',
    icon: <Check className="h-5 w-5 shrink-0" strokeWidth={2.5} />,
  },
  error: {
    border: '#e8507a',
    iconClass: 'text-[#e8507a]',
    icon: <X className="h-5 w-5 shrink-0" strokeWidth={2.5} />,
  },
  info: {
    border: '#3b82f6',
    iconClass: 'text-blue-400',
    icon: <Info className="h-5 w-5 shrink-0" />,
  },
  warning: {
    border: '#f59e0b',
    iconClass: 'text-amber-400',
    icon: <AlertTriangle className="h-5 w-5 shrink-0" />,
  },
}

const AUTO_MS = 4000
const MAX_VISIBLE = 3

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const push = useCallback((tone: ToastTone, title: string, message?: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    setToasts((prev) => {
      const next = [...prev, { id, tone, title, message }]
      return next.slice(-MAX_VISIBLE)
    })
  }, [])

  const api = useMemo(
    () => ({
      success: (t: string, m?: string) => push('success', t, m),
      error: (t: string, m?: string) => push('error', t, m),
      info: (t: string, m?: string) => push('info', t, m),
      warning: (t: string, m?: string) => push('warning', t, m),
      toast: (message: string, type: 'success' | 'error' | 'info' = 'info') => {
        const tone = type === 'success' ? 'success' : type === 'error' ? 'error' : 'info'
        push(tone, message)
      },
    }),
    [push]
  )

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const startExit = useCallback((id: string) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, exiting: true } : t))
    )
    setTimeout(() => dismiss(id), 200)
  }, [dismiss])

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none w-[min(420px,calc(100vw-32px))]"
        aria-live="polite"
      >
        {toasts.map((item) => (
          <ToastRow
            key={item.id}
            item={item}
            onDismiss={() => startExit(item.id)}
            onRemove={() => dismiss(item.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastRow({
  item,
  onDismiss,
  onRemove,
}: {
  item: ToastItem
  onDismiss: () => void
  onRemove: () => void
}) {
  const st = TONE_STYLES[item.tone]
  const pauseRef = useRef(false)
  const leftRef = useRef(AUTO_MS)

  useEffect(() => {
    leftRef.current = AUTO_MS
    const tick = 100
    const id = setInterval(() => {
      if (pauseRef.current) return
      leftRef.current -= tick
      if (leftRef.current <= 0) {
        clearInterval(id)
        onDismiss()
      }
    }, tick)
    return () => clearInterval(id)
  }, [item.id, onDismiss])

  return (
    <div
      className={cn(
        'pointer-events-auto flex min-w-[300px] max-w-[420px] items-center gap-3 rounded-xl border border-white/10 bg-[#1a1520] py-3.5 pl-[18px] pr-3 shadow-xl transition-all duration-300 ease-out',
        item.exiting ? 'translate-x-full opacity-0 duration-200' : 'translate-x-0 opacity-100'
      )}
      style={{ borderLeftWidth: 3, borderLeftColor: st.border }}
      role="status"
      onMouseEnter={() => {
        pauseRef.current = true
      }}
      onMouseLeave={() => {
        pauseRef.current = false
      }}
    >
      <span className={st.iconClass}>{st.icon}</span>
      <div className="min-w-0 flex-1">
        <p className="font-body text-[14px] font-semibold text-white leading-snug">{item.title}</p>
        {item.message && (
          <p className="font-body text-[12px] text-white/50 mt-0.5 leading-relaxed">{item.message}</p>
        )}
      </div>
      <button
        type="button"
        className="shrink-0 rounded-lg p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5 transition-colors"
        aria-label="Dismiss"
        onClick={() => onRemove()}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return ctx
}
