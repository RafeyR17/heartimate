'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { Loader2, X } from 'lucide-react'
import type { ProfileUser } from '@/lib/profile-types'
import { useAccessibleDialog } from '@/lib/use-accessible-dialog'
import { iconTouchClass } from '@/lib/touch-targets'
import { apiFetch } from '@/lib/api-client'
import { DEFAULT_AVATAR } from './shared/constants'

export function EditProfileModal({
  user,
  clerkImageUrl,
  onClose,
  onSaved,
}: {
  user: ProfileUser
  clerkImageUrl: string | null
  onClose: () => void
  onSaved: (u: ProfileUser) => void
}) {
  const [displayName, setDisplayName] = useState(user.display_name)
  const [bio, setBio] = useState(user.bio ?? '')
  const [preview, setPreview] = useState(user.avatar_url || clerkImageUrl || DEFAULT_AVATAR)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const { dialogRef, titleId } = useAccessibleDialog(true, onClose, { disabled: saving })

  const handleFile = (file: File | null) => {
    if (!file) return
    setAvatarFile(file)
    setPreview(URL.createObjectURL(file))
  }

  const handleSave = async () => {
    if (!displayName.trim()) {
      setError('Display name is required')
      return
    }
    setSaving(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('displayName', displayName.trim())
      formData.append('bio', bio.trim())
      if (avatarFile) formData.append('avatar', avatarFile)
      else if (user.avatar_url) formData.append('avatarUrl', user.avatar_url)

      const result = await apiFetch<{
        user: ProfileUser
      }>('/api/users/me', { method: 'PATCH', body: formData })
      if (!result.ok) {
        setError(result.error || 'Could not save profile')
        return
      }
      const userPayload = result.data.user as ProfileUser

      onSaved({
        id: userPayload.id,
        display_name: userPayload.display_name,
        bio: userPayload.bio,
        avatar_url: userPayload.avatar_url,
        is_premium: userPayload.is_premium,
        created_at: userPayload.created_at,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save profile')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[150] flex items-end md:items-center justify-center p-0 md:p-4"
      style={{ background: 'rgba(8,6,8,0.85)', backdropFilter: 'blur(20px)' }}
    >
      <button
        type="button"
        className="absolute inset-0"
        aria-label="Close edit profile dialog"
        onClick={onClose}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full md:max-w-[480px] bg-[#0d0a0e] border border-white/10 rounded-t-[20px] md:rounded-[20px] p-8 md:p-10 max-h-[92dvh] overflow-y-auto pb-[max(2rem,env(safe-area-inset-bottom))] outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className={`absolute top-2 right-2 ${iconTouchClass} text-muted hover:text-white cursor-pointer`}
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 id={titleId} className="font-heading text-[24px] text-white mb-8">
          Edit Profile
        </h2>

        <div className="flex flex-col items-center mb-8">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-[#e8507a]/40 cursor-pointer"
            aria-label="Change profile photo"
          >
            <Image src={preview} alt="" fill className="object-cover" sizes="80px" />
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="font-body text-[13px] text-[#e8507a] mt-3 cursor-pointer"
          >
            Change photo
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          />
        </div>

        <label className="block mb-4">
          <span className="font-body text-[13px] text-muted block mb-1.5">Display name</span>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 font-body text-[14px] text-white outline-none focus:border-[#e8507a]/50"
          />
        </label>

        <label className="block mb-6">
          <span className="font-body text-[13px] text-muted block mb-1.5">Bio</span>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value.slice(0, 280))}
            rows={3}
            placeholder="Tell your companions about yourself..."
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 font-body text-[14px] text-white outline-none focus:border-[#e8507a]/50 resize-none"
          />
          <span className="font-body text-[11px] text-white/30 float-right mt-1">
            {bio.length}/280
          </span>
        </label>

        {error && <p className="text-[#e8507a] text-[13px] mb-4">{error}</p>}

        <button
          type="button"
          disabled={saving}
          onClick={handleSave}
          className="w-full py-3 rounded-xl bg-[#e8507a] text-white font-body font-medium text-[14px] hover:bg-[#e8507a]/90 disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          Save
        </button>
        <button
          type="button"
          onClick={onClose}
          className="w-full py-3 mt-2 rounded-xl border border-white/10 text-muted font-body text-[14px] hover:text-white cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
