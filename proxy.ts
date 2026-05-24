import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { stripCredentialQueryFromUrl } from '@/lib/auth-query-strip'
import { buildContentSecurityPolicy } from '@/lib/security-headers'
import { REQUEST_ID_HEADER } from '@/lib/observability/constants'
import { normalizeRequestId } from '@/lib/observability/request-id'
import { isClerkConfigured } from '@/lib/runtime-env'

const AUTH_PATHS = new Set(['/login', '/signup'])

function redirectIfCredentialQuery(req: NextRequest): NextResponse | null {
  if (!AUTH_PATHS.has(req.nextUrl.pathname)) return null
  const clean = stripCredentialQueryFromUrl(req.nextUrl)
  if (!clean) return null
  return NextResponse.redirect(clean, 303)
}

const isProtectedRoute = createRouteMatcher([
  '/home(.*)',
  '/chat(.*)',
  '/characters',
  '/characters/create(.*)',
  '/characters/(.*)/edit(.*)',
  '/profile(.*)',
  '/settings(.*)',
  '/favorites(.*)',
  '/personas(.*)',
  '/onboarding(.*)',
])

// Public browsing (no auth.protect): /, /explore, /characters/[id] (view only), /login, /signup

const isPublicApi = createRouteMatcher([
  '/api/onboarding',
  '/api/health',
  '/api/cron(.*)',
])

function proxyResponse(req: NextRequest): NextResponse {
  const requestId = normalizeRequestId(req.headers.get(REQUEST_ID_HEADER))
  const requestHeaders = new Headers(req.headers)
  requestHeaders.set(REQUEST_ID_HEADER, requestId)

  const res = NextResponse.next({
    request: { headers: requestHeaders },
  })
  res.headers.set(REQUEST_ID_HEADER, requestId)
  // CSP only in production — dev must allow Next.js/Clerk inline scripts (next.config cannot hot-reload headers).
  res.headers.delete('Content-Security-Policy')
  if (process.env.NODE_ENV === 'production') {
    res.headers.set('Content-Security-Policy', buildContentSecurityPolicy())
  }
  return res
}

/** CI Lighthouse / local build without Clerk keys — public pages only. */
function fallbackMiddleware(req: NextRequest) {
  const credentialRedirect = redirectIfCredentialQuery(req)
  if (credentialRedirect) return credentialRedirect

  if (req.nextUrl.pathname.startsWith('/api')) {
    if (isPublicApi(req) && req.method === 'GET') {
      return proxyResponse(req)
    }
    return NextResponse.json(
      { success: false, error: 'Authentication is not configured' },
      { status: 503 }
    )
  }

  if (isProtectedRoute(req)) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  return proxyResponse(req)
}

const clerkProxy = clerkMiddleware(async (auth, req) => {
  const credentialRedirect = redirectIfCredentialQuery(req)
  if (credentialRedirect) return credentialRedirect

  if (req.nextUrl.pathname.startsWith('/api')) {
    if (isPublicApi(req) && req.method === 'GET') {
      // allow
    } else {
      await auth.protect()
    }
  } else if (isProtectedRoute(req)) {
    await auth.protect()
  }

  return proxyResponse(req)
})

export default isClerkConfigured() ? clerkProxy : fallbackMiddleware

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
