/**
 * Blocks common disposable / temp-mail domains at sign-up (client-side guard).
 * Pair with Clerk Dashboard → Attack protection → block disposable emails.
 */

const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i

/** High-volume disposable providers (domain only, lowercase). */
const DISPOSABLE_EMAIL_DOMAINS = new Set([
  '10minutemail.com',
  '10minutemail.net',
  '20minutemail.com',
  '33mail.com',
  'anonaddy.me',
  'dispostable.com',
  'dropmail.me',
  'duck.com',
  'emailondeck.com',
  'fakeinbox.com',
  'getairmail.com',
  'getnada.com',
  'guerrillamail.com',
  'guerrillamail.net',
  'guerrillamail.org',
  'harakirimail.com',
  'inboxkitten.com',
  'maildrop.cc',
  'mailinator.com',
  'mailinator.net',
  'mailinator.org',
  'mailnesia.com',
  'mailpoof.com',
  'mail.tm',
  'mintemail.com',
  'moakt.com',
  'mohmal.com',
  'mytemp.email',
  'nada.email',
  'nada.ltd',
  'sharklasers.com',
  'spam4.me',
  'tempail.com',
  'temp-mail.org',
  'tempmail.com',
  'tempmail.net',
  'tempmailo.com',
  'tempmailaddress.com',
  'tempinbox.com',
  'tempmail.ninja',
  'throwaway.email',
  'trashmail.com',
  'trashmail.de',
  'trashmail.net',
  'trashmail.org',
  'yopmail.com',
  'yopmail.fr',
  'yopmail.net',
])

export type SignupEmailValidation =
  | { ok: true; normalized: string }
  | { ok: false; message: string }

export function extractEmailDomain(email: string): string | null {
  const at = email.lastIndexOf('@')
  if (at < 1 || at === email.length - 1) return null
  return email.slice(at + 1).trim().toLowerCase()
}

export function isDisposableEmailDomain(domain: string): boolean {
  const normalized = domain.trim().toLowerCase()
  if (!normalized) return false
  if (DISPOSABLE_EMAIL_DOMAINS.has(normalized)) return true
  // Subdomains of known providers, e.g. abc.mailinator.com
  const parts = normalized.split('.')
  for (let i = 0; i < parts.length - 1; i++) {
    const candidate = parts.slice(i).join('.')
    if (DISPOSABLE_EMAIL_DOMAINS.has(candidate)) return true
  }
  return false
}

export function validateSignupEmail(raw: string): SignupEmailValidation {
  const normalized = raw.trim().toLowerCase()
  if (!normalized) {
    return { ok: false, message: 'Email is required.' }
  }
  if (!EMAIL_FORMAT.test(normalized)) {
    return { ok: false, message: 'Please enter a valid email address.' }
  }
  const domain = extractEmailDomain(normalized)
  if (!domain) {
    return { ok: false, message: 'Please enter a valid email address.' }
  }
  if (isDisposableEmailDomain(domain)) {
    return {
      ok: false,
      message:
        'Temporary or disposable email addresses are not allowed. Use a regular email (Gmail, Outlook, etc.).',
    }
  }
  return { ok: true, normalized }
}
