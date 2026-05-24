import 'server-only'
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto'

const ALGO = 'aes-256-gcm'
const IV_LEN = 12
const TAG_LEN = 16
const SALT = 'heartimate-byok-v1'

function encryptionKey(): Buffer {
  const secret = process.env.ENCRYPTION_SECRET?.trim()
  if (!secret || secret.length < 16) {
    throw new Error('ENCRYPTION_SECRET must be set (min 16 characters)')
  }
  return scryptSync(secret, SALT, 32)
}

/** Encrypt a provider API key for storage (AES-256-GCM). */
export function encryptKey(plain: string): string {
  const iv = randomBytes(IV_LEN)
  const cipher = createCipheriv(ALGO, encryptionKey(), iv)
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, enc]).toString('base64')
}

/** Decrypt a stored provider API key. */
export function decryptKey(encoded: string): string {
  const buf = Buffer.from(encoded, 'base64')
  if (buf.length < IV_LEN + TAG_LEN + 1) {
    throw new Error('Invalid encrypted key payload')
  }
  const iv = buf.subarray(0, IV_LEN)
  const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN)
  const data = buf.subarray(IV_LEN + TAG_LEN)
  const decipher = createDecipheriv(ALGO, encryptionKey(), iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8')
}
