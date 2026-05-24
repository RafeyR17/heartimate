const IMAGE_CMD_RE = /^\/(image|pic|photo)(?:\s+([\s\S]*))?$/i

/** Parse /image, /pic, /photo commands; returns request text or empty string. */
export function parseChatImageCommand(text: string): string | null {
  const trimmed = text.trim()
  const match = trimmed.match(IMAGE_CMD_RE)
  if (!match) return null
  return (match[2] ?? '').trim()
}
