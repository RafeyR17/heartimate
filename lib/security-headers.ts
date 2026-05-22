type Header = { key: string; value: string }

/** Build Content-Security-Policy (nonce-based tightening later if needed). */
export function buildContentSecurityPolicy(): string {
  const isProd = process.env.NODE_ENV === 'production'
  // Next.js boot/HMR uses inline scripts; strict script-src without 'unsafe-inline' breaks dev and hydration.
  const scriptSrc = [
    "script-src 'self'",
    "'unsafe-inline'",
    ...(isProd ? [] : ["'unsafe-eval'"]),
    'https://*.clerk.accounts.dev',
    'https://*.clerk.com',
    'https://challenges.cloudflare.com',
  ]

  const directives = [
    "default-src 'self'",
    scriptSrc.join(' '),
    [
      "connect-src 'self'",
      'https://*.clerk.accounts.dev',
      'https://*.clerk.com',
      'https://us.i.posthog.com',
      'https://*.supabase.co',
      'wss://*.supabase.co',
    ].join(' '),
    [
      "img-src 'self' data: blob:",
      'https://*.supabase.co',
      'https://*.supabase.in',
      'https://img.clerk.com',
      'https://images.clerk.dev',
    ].join(' '),
    "style-src 'self' 'unsafe-inline'",
    [
      'frame-src',
      'https://*.clerk.accounts.dev',
      'https://*.clerk.com',
      'https://challenges.cloudflare.com',
    ].join(' '),
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "worker-src 'self' blob:",
    "media-src 'self' blob:",
    "font-src 'self'",
  ]

  return directives.join('; ')
}

/** Security headers applied to all routes via next.config.ts headers(). */
export function getSecurityHeaders(): Header[] {
  const headers: Header[] = [
    { key: 'X-DNS-Prefetch-Control', value: 'on' },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    {
      key: 'Permissions-Policy',
      value: 'camera=(), microphone=(), geolocation=()',
    },
  ]

  if (process.env.NODE_ENV === 'production') {
    headers.push({
      key: 'Strict-Transport-Security',
      value: 'max-age=31536000; includeSubDomains; preload',
    })
  }

  return headers
}
