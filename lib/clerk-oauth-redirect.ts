/** Absolute OAuth callback URLs required by Clerk custom sign-in/sign-up flows. */
export function getClerkOAuthRedirectUrls(completePath: string): {
  redirectUrl: string
  redirectUrlComplete: string
} {
  const origin = getAppOrigin()
  const complete = completePath.startsWith('http')
    ? completePath
    : `${origin}${completePath.startsWith('/') ? completePath : `/${completePath}`}`

  return {
    redirectUrl: `${origin}/sso-callback`,
    redirectUrlComplete: complete,
  }
}

function getAppOrigin(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin
  }
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (fromEnv) return fromEnv.replace(/\/$/, '')
  return 'http://localhost:3000'
}
