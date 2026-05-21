import { describe, expect, it } from 'vitest'
import sharp from 'sharp'
import {
  processAvatarUpload,
  reencodeImageBuffer,
  sanitizeFileName,
  validateImageFile,
  verifyImageBuffer,
} from '@/lib/upload'

function fileFromBuffer(buffer: Buffer, name: string, type: string): File {
  const bytes = new Uint8Array(buffer)
  return new File([bytes], name, { type })
}

describe('validateImageFile', () => {
  it('rejects disallowed MIME types', () => {
    const file = fileFromBuffer(Buffer.from('x'), 'x.php', 'application/x-php')
    expect(validateImageFile(file).valid).toBe(false)
  })

  it('rejects files over 5MB', () => {
    const file = fileFromBuffer(Buffer.alloc(5 * 1024 * 1024 + 1), 'big.jpg', 'image/jpeg')
    expect(validateImageFile(file).valid).toBe(false)
  })
})

describe('verifyImageBuffer', () => {
  it('accepts a real PNG from sharp', async () => {
    const png = await sharp({
      create: { width: 8, height: 8, channels: 3, background: { r: 255, g: 0, b: 0 } },
    })
      .png()
      .toBuffer()

    const result = await verifyImageBuffer(png)
    expect(result).toEqual({ ok: true, mime: 'image/png' })
  })

  it('rejects JPEG magic bytes with invalid body', async () => {
    const fake = Buffer.from([0xff, 0xd8, 0xff, 0xe0, ...Buffer.from('<?php echo 1; ?>')])
    const result = await verifyImageBuffer(fake)
    expect(result.ok).toBe(false)
  })

  it('rejects random binary', async () => {
    const result = await verifyImageBuffer(Buffer.from('not-an-image'))
    expect(result.ok).toBe(false)
  })
})

describe('reencodeImageBuffer', () => {
  it('produces a smaller normalized JPEG', async () => {
    const jpeg = await sharp({
      create: { width: 16, height: 16, channels: 3, background: { r: 0, g: 128, b: 255 } },
    })
      .jpeg()
      .toBuffer()

    const out = await reencodeImageBuffer(jpeg, 'image/jpeg')
    expect(out.length).toBeGreaterThan(0)
    expect(await verifyImageBuffer(out)).toEqual({ ok: true, mime: 'image/jpeg' })
  })
})

describe('processAvatarUpload', () => {
  it('rejects spoofed MIME with non-image bytes', async () => {
    const file = fileFromBuffer(Buffer.from('<?php'), 'evil.jpg', 'image/jpeg')
    const result = await processAvatarUpload(file)
    expect(result.ok).toBe(false)
  })

  it('returns re-encoded buffer and safe filename', async () => {
    const png = await sharp({
      create: { width: 12, height: 12, channels: 3, background: { r: 10, g: 20, b: 30 } },
    })
      .png()
      .toBuffer()
    const file = fileFromBuffer(png, '../../../secret.png', 'image/png')

    const result = await processAvatarUpload(file, { namePrefix: 'user-abc' })
    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.contentType).toBe('image/png')
    expect(result.fileName).toMatch(/^user-abc-\d+-[a-z0-9]+\.png$/)
    expect(result.fileName).not.toContain('secret')
    expect(await verifyImageBuffer(result.buffer)).toEqual({ ok: true, mime: 'image/png' })
  })
})

describe('sanitizeFileName', () => {
  it('strips unsafe characters from prefix', () => {
    expect(sanitizeFileName('../../etc/passwd', 'png')).toMatch(/^etcpasswd-\d+-[a-z0-9]+\.png$/)
  })
})
