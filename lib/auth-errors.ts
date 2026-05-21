type ClerkErrorShape = {
  code?: string
  message?: string
  longMessage?: string
}

const CLERK_MESSAGES: Record<string, string> = {
  form_identifier_not_found: 'No account found with that email.',
  form_password_incorrect: 'Incorrect password. Please try again.',
  form_code_incorrect: 'That code is incorrect. Check your email and try again.',
  verification_failed: 'Verification failed. Please request a new code.',
  form_identifier_exists: 'An account with this email already exists. Try signing in.',
  form_password_pwned: 'This password has appeared in a data breach. Choose a different one.',
  form_password_length_too_short: 'Password is too short. Use at least 8 characters.',
  form_password_not_strong_enough: 'Choose a stronger password with letters and numbers.',
  form_param_format_invalid: 'Please enter a valid email address.',
  session_exists: 'You are already signed in.',
  too_many_requests: 'Too many attempts. Wait a moment and try again.',
  oauth_account_not_linked: 'This Google account is not linked. Sign in with email first.',
  not_allowed_access: 'Sign-in is not available for this account.',
  user_locked: 'Your account is temporarily locked. Try again later.',
  strategy_for_user_invalid: 'This sign-in method is not enabled for your account.',
}

function normalizeCode(code: string) {
  return code.toLowerCase().replace(/-/g, '_')
}

export function mapClerkError(
  err: unknown,
  fallback = 'Something went wrong. Please try again.'
): string {
  if (!err || typeof err !== 'object') return fallback

  const errors = (err as { errors?: ClerkErrorShape[] }).errors
  if (!errors?.length) return fallback

  const first = errors[0]
  if (first.code) {
    const mapped = CLERK_MESSAGES[normalizeCode(first.code)]
    if (mapped) return mapped
  }

  const raw = first.longMessage || first.message
  if (!raw) return fallback

  const lower = raw.toLowerCase()
  if (lower.includes('password') && lower.includes('incorrect')) {
    return CLERK_MESSAGES.form_password_incorrect
  }
  if (lower.includes('identifier') && lower.includes('not found')) {
    return CLERK_MESSAGES.form_identifier_not_found
  }
  if (lower.includes('already exists') || lower.includes('taken')) {
    return CLERK_MESSAGES.form_identifier_exists
  }
  if (lower.includes('verification') || lower.includes('code')) {
    return CLERK_MESSAGES.form_code_incorrect
  }

  return fallback
}
