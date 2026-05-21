import sharp from 'sharp'

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
] as const

export type AllowedImageMime = (typeof ALLOWED_MIME_TYPES)[number]

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

const FORMAT_TO_MIME: Record<string, AllowedImageMime> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
}

const MIME_TO_EXT: Record<AllowedImageMime, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

export type ImageBufferVerification =
  | { ok: true; mime: AllowedImageMime }
  | { ok: false; error: string }

export type ProcessedAvatarUpload =
  | { ok: true; buffer: Buffer; contentType: AllowedImageMime; fileName: string }
  | { ok: false; error: string }

export function validateImageFile(file: File): {
  valid: boolean
  error?: string
} {
  if (!ALLOWED_MIME_TYPES.includes(file.type as AllowedImageMime)) {
    return {
      valid: false,
      error: 'Only JPEG, PNG, WebP, GIF allowed',
    }
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: 'File must be under 5MB',
    }
  }

  return { valid: true }
}

/** Detect image type from magic bytes via sharp metadata (not client MIME). */
export async function verifyImageBuffer(buffer: Buffer): Promise<ImageBufferVerification> {
  if (buffer.length === 0) {
    return { ok: false, error: 'Empty file' }
  }

  if (buffer.length > MAX_FILE_SIZE) {
    return { ok: false, error: 'File must be under 5MB' }
  }

  let format: string | undefined
  try {
    const meta = await sharp(buffer, { animated: true }).metadata()
    format = meta.format
  } catch {
    return { ok: false, error: 'Invalid or unsupported image file' }
  }

  const mime = format ? FORMAT_TO_MIME[format] : undefined
  if (!mime) {
    return { ok: false, error: 'Only JPEG, PNG, WebP, GIF allowed' }
  }

  return { ok: true, mime }
}

/** Re-encode to strip EXIF/metadata and neutralize polyglots. */
export async function reencodeImageBuffer(
  buffer: Buffer,
  mime: AllowedImageMime
): Promise<Buffer> {
  const pipeline = sharp(buffer, { animated: mime === 'image/gif' }).rotate()

  switch (mime) {
    case 'image/jpeg':
    case 'image/jpg':
      return pipeline.jpeg({ quality: 85, mozjpeg: true }).toBuffer()
    case 'image/png':
      return pipeline.png({ compressionLevel: 9 }).toBuffer()
    case 'image/webp':
      return pipeline.webp({ quality: 85 }).toBuffer()
    case 'image/gif':
      return pipeline.gif().toBuffer()
  }
}

export function sanitizeFileName(prefix?: string, ext = 'jpg'): string {
  const safePrefix = prefix
    ? `${prefix.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64)}-`
    : ''
  const safeExt = ext.replace(/[^a-z0-9]/gi, '').slice(0, 4) || 'jpg'
  return `${safePrefix}${Date.now()}-${Math.random().toString(36).slice(2)}.${safeExt}`
}

/**
 * validateImageFile → verifyImageBuffer → reencodeImageBuffer.
 * Returns a safe buffer + server-chosen filename/extension for storage upload.
 */
export async function processAvatarUpload(
  file: File,
  opts?: { namePrefix?: string }
): Promise<ProcessedAvatarUpload> {
  const check = validateImageFile(file)
  if (!check.valid) {
    return { ok: false, error: check.error ?? 'Invalid image' }
  }

  const raw = Buffer.from(await file.arrayBuffer())
  const verified = await verifyImageBuffer(raw)
  if (!verified.ok) {
    return verified
  }

  let buffer: Buffer
  try {
    buffer = await reencodeImageBuffer(raw, verified.mime)
  } catch {
    return { ok: false, error: 'Failed to process image' }
  }

  if (buffer.length === 0 || buffer.length > MAX_FILE_SIZE) {
    return { ok: false, error: 'Processed image exceeds size limit' }
  }

  const ext = MIME_TO_EXT[verified.mime]
  const fileName = sanitizeFileName(opts?.namePrefix, ext)

  return {
    ok: true,
    buffer,
    contentType: verified.mime === 'image/jpg' ? 'image/jpeg' : verified.mime,
    fileName,
  }
}
