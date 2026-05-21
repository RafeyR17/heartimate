/** Private characters: owner only. Public characters: anyone (including guests). */
export function characterReadableByUser(
  character: { is_public: boolean | null; user_id: string },
  viewerUserId: string | null | undefined
): boolean {
  if (character.is_public === true) return true
  if (!viewerUserId) return false
  return character.user_id === viewerUserId
}
