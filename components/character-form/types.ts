export type CharacterFormInitial = {
  id: string
  name: string
  description: string | null
  personality: string | null
  scenario: string | null
  greeting: string | null
  example_dialogs: string | null
  tags: string[] | null
  is_nsfw: boolean
  is_public: boolean
  avatar_url: string | null
}

export type CharacterFormProps = {
  mode?: 'create' | 'edit'
  characterId?: string
  initialCharacter?: CharacterFormInitial | null
}

export type ExampleDialog = { user: string; char: string }

export type CharacterFormState = {
  name: string
  description: string
  gender: string
  age: string
  personality: string
  scenario: string
  greeting: string
  exampleDialogs: ExampleDialog[]
  tags: string[]
  isNsfw: boolean
  isPublic: boolean
  avatarFile: File | null
  avatarPreview: string
}

export type CharacterFormUpdate = (
  field: keyof CharacterFormState,
  value: unknown,
) => void
