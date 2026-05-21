import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { REQUEST_ID_HEADER } from '@/lib/observability/constants'
import { normalizeRequestId } from '@/lib/observability/request-id'

const isProtectedRoute = createRouteMatcher([
  '/home(.*)',
  '/chat(.*)',
  '/characters/create(.*)',
  '/characters/(.*)/edit(.*)',
  '/profile(.*)',
  '/personas(.*)',
  '/onboarding(.*)',
])

// Public browsing (no auth.protect): /, /explore, /characters/[id] (view only), /login, /signup

const isPublicApi = createRouteMatcher([
  '/api/onboarding',
  '/api/health',
  '/api/cron(.*)',
])

export default clerkMiddleware(async (auth, req) => {
  if (req.nextUrl.pathname.startsWith('/api')) {
    if (isPublicApi(req) && req.method === 'GET') {
      // allow
    } else {
      await auth.protect()
    }
  } else if (isProtectedRoute(req)) {
    await auth.protect()
  }

  const requestId = normalizeRequestId(req.headers.get(REQUEST_ID_HEADER))
  const requestHeaders = new Headers(req.headers)
  requestHeaders.set(REQUEST_ID_HEADER, requestId)

  const res = NextResponse.next({
    request: { headers: requestHeaders },
  })
  res.headers.set(REQUEST_ID_HEADER, requestId)
  return res
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
