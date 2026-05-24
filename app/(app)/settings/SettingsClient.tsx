'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Eye, EyeOff, Trash2 } from 'lucide-react'
import { apiFetch } from '@/lib/api-client'
import { useToast } from '@/components/ToastProvider'
import { FREE_DAILY_LIMIT } from '@/lib/quota-constants'

type ApiKeyStatus = {
  hasByok: boolean
  provider: 'openrouter' | 'openai' | null
  keyPreview: string | null
  dailyCount: number
  dailyLimit: number
  remaining: number
  resetAt: string
  resetIn: string
}

type Provider = 'openrouter' | 'openai'

export default function SettingsClient() {
  const { success, error: toastError } = useToast()
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<ApiKeyStatus | null>(null)
  const [provider, setProvider] = useState<Provider>('openrouter')
  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false)
  const [error, setError] = useState('')

  const loadStatus = useCallback(async () => {
    const result = await apiFetch<ApiKeyStatus>('/api/users/api-key', {
      cache: 'no-store',
    })
    if (result.ok) {
      setStatus(result.data)
      if (result.data.provider === 'openai' || result.data.provider === 'openrouter') {
        setProvider(result.data.provider)
      }
    } else {
      toastError('Could not load settings', result.error)
    }
    setLoading(false)
  }, [toastError])

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      void loadStatus()
    }, 0)
    return () => clearTimeout(timeoutId)
  }, [loadStatus])

  const used = status?.dailyCount ?? 0
  const limit = status?.dailyLimit ?? FREE_DAILY_LIMIT
  const unlimited = Boolean(status?.hasByok) || (status?.remaining ?? 0) < 0
  const pct = unlimited ? 100 : Math.min(100, Math.round((used / limit) * 100))
  const barColor =
    used >= limit ? 'bg-red-500' : used >= limit - 5 ? 'bg-amber-500' : 'bg-rose'

  async function handleSaveKey() {
    if (!apiKey.trim()) {
      setError('Please enter your API key')
      return
    }
    setSaving(true)
    setError('')
    const result = await apiFetch<{ message?: string }>('/api/users/api-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: apiKey.trim(), provider }),
    })
    setSaving(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setApiKey('')
    success('API key verified!', 'Unlimited chats unlocked 🎉')
    void loadStatus()
  }

  async function handleRemoveKey() {
    setRemoving(true)
    setError('')
    const result = await apiFetch<{ message?: string }>('/api/users/api-key', {
      method: 'DELETE',
      credentials: 'same-origin',
    })
    setRemoving(false)
    if (!result.ok) {
      toastError('Failed to remove key', result.error)
      return
    }
    setRemoveConfirmOpen(false)
    success('API key removed')
    setStatus((prev) =>
      prev
        ? {
            ...prev,
            hasByok: false,
            provider: null,
            keyPreview: null,
            remaining: Math.max(0, FREE_DAILY_LIMIT - prev.dailyCount),
          }
        : prev
    )
    void loadStatus()
  }

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-[720px] mx-auto w-full flex flex-col gap-8">
      <header>
        <h1 className="font-heading italic text-[36px] text-white">Settings</h1>
      </header>

      {loading && (
        <p className="font-body text-sm text-muted">Loading…</p>
      )}

      {!loading && (
        <>
          <section className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-7">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h2 className="font-body font-semibold text-[16px] text-white">
                🔑 Your API Key
              </h2>
              <span
                className={`text-[11px] font-label uppercase tracking-wider px-3 py-1 rounded-full border ${
                  status?.hasByok
                    ? 'text-green-400 border-green-500/30 bg-green-500/10'
                    : 'text-muted border-white/10 bg-white/[0.03]'
                }`}
              >
                {status?.hasByok ? '● Unlimited' : '● Free Tier'}
              </span>
            </div>
            <p className="font-body text-[14px] text-muted mt-2 leading-relaxed">
              Add your own OpenRouter or OpenAI API key to unlock unlimited chats. Your key
              is encrypted and never shared.
            </p>
            <Link
              href="https://openrouter.ai/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-2 font-body text-[13px] text-rose hover:text-rose/80"
            >
              Get a free OpenRouter key →
            </Link>

            {status?.hasByok ? (
              <div className="mt-5 space-y-4">
                <div className="rounded-xl border border-green-500/20 bg-green-500/[0.05] p-4">
                  <p className="font-body text-[14px] text-green-400 font-medium">
                    ✓ {status.provider === 'openai' ? 'OpenAI' : 'OpenRouter'} key connected
                  </p>
                  <p className="font-body text-[13px] text-muted mt-1">
                    Unlimited chats enabled
                  </p>
                  <p className="font-mono text-[12px] text-white/50 mt-2">
                    {status.keyPreview ?? 'sk-••••••••••••'}
                  </p>
                </div>
                {removeConfirmOpen ? (
                  <div
                    className="rounded-xl border border-amber-500/30 bg-amber-500/[0.06] p-4 space-y-3"
                    role="alertdialog"
                    aria-labelledby="remove-key-title"
                    aria-describedby="remove-key-desc"
                  >
                    <p
                      id="remove-key-title"
                      className="font-body text-[14px] text-white font-medium"
                    >
                      Remove API key?
                    </p>
                    <p id="remove-key-desc" className="font-body text-[13px] text-muted">
                      You will return to the {FREE_DAILY_LIMIT} messages/day free tier.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={removing}
                        onClick={() => void handleRemoveKey()}
                        className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-full bg-red-600/90 text-white font-body text-[13px] font-medium hover:bg-red-600 disabled:opacity-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" aria-hidden />
                        {removing ? 'Removing…' : 'Yes, remove key'}
                      </button>
                      <button
                        type="button"
                        disabled={removing}
                        onClick={() => setRemoveConfirmOpen(false)}
                        className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-full border border-white/15 text-muted font-body text-[13px] hover:text-white hover:border-white/25 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setRemoveConfirmOpen(true)}
                    className="inline-flex items-center gap-2 font-body text-[13px] text-muted hover:text-white transition-colors min-h-[44px] min-w-[44px]"
                  >
                    <Trash2 className="w-4 h-4" aria-hidden />
                    Remove
                  </button>
                )}
              </div>
            ) : (
              <div className="mt-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(
                    [
                      {
                        id: 'openrouter' as const,
                        title: 'OpenRouter',
                        lines: ['Access 100+ models', 'Free models available'],
                        badge: 'Recommended',
                      },
                      {
                        id: 'openai' as const,
                        title: 'OpenAI',
                        lines: ['GPT-4o, GPT-4o mini', 'Requires credits'],
                      },
                    ] as const
                  ).map((card) => (
                    <button
                      key={card.id}
                      type="button"
                      onClick={() => setProvider(card.id)}
                      className={`text-left rounded-xl border p-4 transition-colors min-h-[44px] ${
                        provider === card.id
                          ? 'border-rose/50 bg-rose/5'
                          : 'border-white/10 bg-white/[0.02] hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-body font-semibold text-white text-[14px]">
                          {card.title}
                        </p>
                        {'badge' in card && card.badge && (
                          <span className="text-[9px] font-label uppercase tracking-wider text-rose border border-rose/30 rounded-full px-2 py-0.5">
                            {card.badge}
                          </span>
                        )}
                      </div>
                      {card.lines.map((line) => (
                        <p key={line} className="font-body text-[12px] text-muted mt-1">
                          {line}
                        </p>
                      ))}
                    </button>
                  ))}
                </div>

                <label className="block mt-4 font-label text-[10px] uppercase tracking-[0.15em] text-muted">
                  Paste your API key
                </label>
                <div className="relative mt-2">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={provider === 'openrouter' ? 'sk-or-...' : 'sk-...'}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 pr-12 font-mono text-[13px] text-white placeholder:text-white/25 focus:border-rose/40 focus:outline-none"
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-muted hover:text-white min-h-[44px] min-w-[44px] flex items-center justify-center"
                    aria-label={showKey ? 'Hide key' : 'Show key'}
                  >
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {error && (
                  <p className="mt-2 font-body text-[13px] text-rose">{error}</p>
                )}

                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void handleSaveKey()}
                  className="mt-4 w-full min-h-[44px] rounded-full bg-rose text-white font-body font-medium text-[13px] tracking-[0.08em] uppercase hover:bg-rose/90 disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Verifying key…' : 'Verify & Save Key →'}
                </button>
                <p className="mt-3 font-body text-[11px] text-white/35 text-center">
                  🔒 Your key is encrypted with AES-256-GCM before storage.
                </p>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-7">
            <h2 className="font-body font-semibold text-[16px] text-white mb-4">
              📊 Usage Today
            </h2>
            <div className="flex items-center justify-between text-[13px] font-body mb-2">
              <span className="text-muted">Messages used today</span>
              <span className={unlimited ? 'text-green-400' : 'text-white'}>
                {unlimited ? 'Unlimited ∞' : `${used}/${limit}`}
              </span>
            </div>
            {!unlimited && (
              <div className="h-1.5 w-full rounded-full bg-white/[0.08] overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${barColor}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            )}
            <p className="mt-3 font-body text-[12px] text-muted">
              {unlimited
                ? 'BYOK — no daily cap'
                : `Resets in ${status?.resetIn ?? '24h'}`}
            </p>
          </section>

          <section className="rounded-2xl border border-white/[0.07] overflow-hidden">
            <table className="w-full text-left text-[13px] font-body">
              <thead>
                <tr className="border-b border-white/[0.07] bg-white/[0.02]">
                  <th className="p-3 text-muted font-medium">Feature</th>
                  <th className="p-3 text-muted font-medium">Free</th>
                  <th className="p-3 text-rose font-medium">With Your Key</th>
                </tr>
              </thead>
              <tbody className="text-white/80">
                {[
                  ['Daily messages', '20/day', 'Unlimited ∞'],
                  ['Models', 'Basic', 'All models'],
                  ['Response quality', 'Good', 'Best'],
                  ['Priority', 'Normal', 'Fast'],
                  ['Cost', 'Free', 'Your cost'],
                ].map(([feature, free, byok]) => (
                  <tr key={feature} className="border-b border-white/[0.05] last:border-0">
                    <td className="p-3">{feature}</td>
                    <td className="p-3 text-muted">{free}</td>
                    <td className="p-3 text-green-400">{byok}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}
    </div>
  )
}
