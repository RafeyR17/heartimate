'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { capturePostHog } from '@/lib/posthog-browser'
import { apiFetch, requireApiField } from '@/lib/api-client'
import type { ForkPayload } from '@/lib/character-fork'
import { consumeForkPayload } from '@/lib/client-storage'
import { useToast } from '@/components/ToastProvider'
import { parseExampleDialogs } from './parse-example-dialogs'
import type {
  CharacterFormInitial,
  CharacterFormState,
  CharacterFormUpdate,
} from './types'

const emptyForm = (): CharacterFormState => ({
  name: '',
  description: '',
  gender: 'Female',
  age: '',
  personality: '',
  scenario: '',
  greeting: '',
  exampleDialogs: [{ user: '', char: '' }],
  tags: [],
  isNsfw: true,
  isPublic: true,
  avatarFile: null,
  avatarPreview: '',
})

function buildEditForm(initial: CharacterFormInitial): CharacterFormState {
  return {
    name: initial.name || '',
    description: initial.description || '',
    gender: 'Female',
    age: '',
    personality: initial.personality || '',
    scenario: initial.scenario || '',
    greeting: initial.greeting || '',
    exampleDialogs: parseExampleDialogs(initial.example_dialogs),
    tags: initial.tags || [],
    isNsfw: initial.is_nsfw,
    isPublic: initial.is_public,
    avatarFile: null,
    avatarPreview: initial.avatar_url || '',
  }
}

function readForkInitial(): { form: CharacterFormState; forkedFrom: ForkPayload['forkedFrom'] } | null {
  if (typeof window === 'undefined') return null
  const params = new URLSearchParams(window.location.search)
  if (params.get('fork') !== '1') return null
  const data = consumeForkPayload()
  if (!data) return null
  return {
    forkedFrom: data.forkedFrom,
    form: {
      ...emptyForm(),
      name: data.fork.name,
      description: data.fork.description,
      personality: data.fork.personality,
      scenario: data.fork.scenario,
      greeting: data.fork.greeting,
      exampleDialogs: data.fork.exampleDialogs,
      tags: data.fork.tags,
      isNsfw: data.fork.isNsfw,
      isPublic: data.fork.isPublic,
      avatarPreview: data.fork.avatarUrl || '',
    },
  }
}

type UseCharacterFormOptions = {
  mode: 'create' | 'edit'
  characterId?: string
  initialCharacter?: CharacterFormInitial | null
}

export function useCharacterForm({
  mode,
  characterId,
  initialCharacter = null,
}: UseCharacterFormOptions) {
  const router = useRouter()
  const { userId } = useAuth()
  const { success, error: toastError } = useToast()
  const forkInit = mode === 'create' ? readForkInitial() : null
  const [forkedFrom] = useState<{ id: string; name: string } | null>(
    forkInit?.forkedFrom ?? null
  )
  const [form, setForm] = useState<CharacterFormState>(() => {
    if (mode === 'edit' && initialCharacter) return buildEditForm(initialCharacter)
    if (forkInit) return forkInit.form
    return emptyForm()
  })
  const [loading, setLoading] = useState(false)
  const [showTagDropdown, setShowTagDropdown] = useState(false)
  const [showGenderDropdown, setShowGenderDropdown] = useState(false)
  const [showMobilePreview, setShowMobilePreview] = useState(false)

  const dropdownRef = useRef<HTMLDivElement>(null)
  const genderDropdownRef = useRef<HTMLDivElement>(null)

  const [hydratedEditId, setHydratedEditId] = useState<string | null>(
    mode === 'edit' && initialCharacter ? initialCharacter.id : null
  )
  const editId = initialCharacter?.id
  if (mode === 'edit' && initialCharacter && editId && hydratedEditId !== editId) {
    setHydratedEditId(editId)
    setForm(buildEditForm(initialCharacter))
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowTagDropdown(false)
      }
      if (genderDropdownRef.current && !genderDropdownRef.current.contains(event.target as Node)) {
        setShowGenderDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const update: CharacterFormUpdate = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      const url = URL.createObjectURL(file)
      setForm((prev) => ({ ...prev, avatarFile: file, avatarPreview: url }))
    }
  }

  const setAvatarFromGeneratedUrl = (url: string) => {
    setForm((prev) => {
      if (prev.avatarPreview.startsWith('blob:')) {
        URL.revokeObjectURL(prev.avatarPreview)
      }
      return {
        ...prev,
        avatarFile: null,
        avatarPreview: url,
      }
    })
  }

  const removeAvatar = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (form.avatarPreview.startsWith('blob:')) {
      URL.revokeObjectURL(form.avatarPreview)
    }
    setForm((prev) => ({
      ...prev,
      avatarFile: null,
      avatarPreview:
        mode === 'edit' && initialCharacter?.avatar_url ? initialCharacter.avatar_url : '',
    }))
  }

  const addTag = (tag: string) => {
    if (form.tags.length < 8 && !form.tags.includes(tag)) {
      update('tags', [...form.tags, tag])
    }
    setShowTagDropdown(false)
  }

  const removeTag = (tagToRemove: string) => {
    update('tags', form.tags.filter((t) => t !== tagToRemove))
  }

  const addExample = () => {
    if (form.exampleDialogs.length < 3) {
      update('exampleDialogs', [...form.exampleDialogs, { user: '', char: '' }])
    }
  }

  const removeExample = (index: number) => {
    update('exampleDialogs', form.exampleDialogs.filter((_, i) => i !== index))
  }

  const updateExample = (index: number, field: 'user' | 'char', value: string) => {
    const newExamples = [...form.exampleDialogs]
    newExamples[index] = { ...newExamples[index], [field]: value }
    update('exampleDialogs', newExamples)
  }

  const isPublishDisabled = !form.name || !form.personality || !form.greeting

  async function handleSubmit() {
    if (isPublishDisabled) {
      toastError('Missing fields', 'Name, personality and greeting are required')
      return
    }
    if (!userId) {
      toastError('Sign in required', 'You must be signed in')
      return
    }

    try {
      setLoading(true)

      const formData = new FormData()
      if (form.avatarFile) {
        formData.append('avatar', form.avatarFile)
      }
      formData.append('name', form.name)
      formData.append('description', form.description)
      formData.append('gender', form.gender)
      formData.append('age', form.age)
      formData.append('personality', form.personality)
      formData.append('scenario', form.scenario)
      formData.append('greeting', form.greeting)
      formData.append('exampleDialogs', JSON.stringify(form.exampleDialogs))
      formData.append('tags', JSON.stringify(form.tags))
      formData.append('isNsfw', String(form.isNsfw))
      formData.append('isPublic', String(form.isPublic))

      if (mode === 'edit' && characterId) {
        if (!form.avatarFile && form.avatarPreview.startsWith('http')) {
          formData.append('keepAvatarUrl', form.avatarPreview)
        }
        const result = await apiFetch(`/api/characters/${characterId}`, {
          method: 'PATCH',
          body: formData,
        })
        if (!result.ok) {
          throw new Error(result.error || 'Failed to update character')
        }
        success('Character updated successfully')
        router.push(`/characters/${characterId}`)
        return
      }

      if (forkedFrom) {
        formData.append('forkedFromId', forkedFrom.id)
        formData.append('forkedFromName', forkedFrom.name)
      }
      if (!form.avatarFile && form.avatarPreview.startsWith('http')) {
        formData.append('avatarUrl', form.avatarPreview)
      }

      const result = await apiFetch('/api/characters', {
        method: 'POST',
        body: formData,
      })

      if (!result.ok) {
        throw new Error(result.error || 'Failed to create character')
      }

      const data = result.data

      void capturePostHog('character_created', {
        is_public: form.isPublic,
        is_nsfw: form.isNsfw,
        tags_count: form.tags.length,
      })

      success('Character published', 'Your character is live.')
      router.push(`/characters/${requireApiField<string>(data, 'id')}`)
    } catch (err: unknown) {
      console.error(err)
      const msg = err instanceof Error ? err.message : 'Something went wrong'
      toastError(mode === 'edit' ? 'Update failed' : 'Publish failed', msg)
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    if (mode === 'edit' && characterId) {
      router.push(`/characters/${characterId}`)
    } else {
      router.back()
    }
  }

  return {
    forkedFrom,
    form,
    loading,
    showTagDropdown,
    setShowTagDropdown,
    showGenderDropdown,
    setShowGenderDropdown,
    showMobilePreview,
    setShowMobilePreview,
    dropdownRef,
    genderDropdownRef,
    update,
    handleAvatarChange,
    setAvatarFromGeneratedUrl,
    removeAvatar,
    addTag,
    removeTag,
    addExample,
    removeExample,
    updateExample,
    isPublishDisabled,
    handleSubmit,
    handleCancel,
  }
}
