// Security headers applied to every response by the custom server entry
// (src/server.ts).

const R2_BASE_URL = process.env.VITE_R2_BASE_URL ?? ''

// Origins the app legitimately talks to. GTM/Google Ads are loaded from
// __root.tsx; images come from the R2 public bucket.
const GOOGLE_SCRIPTS =
  'https://www.googletagmanager.com https://www.google-analytics.com'
const GOOGLE_CONNECT =
  'https://www.google-analytics.com https://analytics.google.com https://www.googletagmanager.com https://region1.google-analytics.com'

// NOTE: this policy still needs 'unsafe-inline' for scripts, because the app
// inlines the theme-init, GTM and Google Ads snippets, and TanStack Start
// inlines its hydration payload. That materially weakens CSP's XSS protection.
// Removing it requires moving those inline scripts to nonces/hashes.
// Shipped as Report-Only for now: validate against the browser console, then
// promote to `Content-Security-Policy` once it's clean.
const CSP_REPORT_ONLY = [
  `default-src 'self'`,
  `base-uri 'self'`,
  `object-src 'none'`,
  `frame-ancestors 'self'`,
  `form-action 'self'`,
  `script-src 'self' 'unsafe-inline' ${GOOGLE_SCRIPTS}`,
  `style-src 'self' 'unsafe-inline'`,
  `img-src 'self' data: blob: ${R2_BASE_URL} ${GOOGLE_SCRIPTS}`.trim(),
  `font-src 'self'`,
  `connect-src 'self' ${GOOGLE_CONNECT}`,
  `frame-src 'self' https://www.googletagmanager.com`,
]
  .join('; ')
  .replace(/\s+/g, ' ')

const HEADERS: Record<string, string> = {
  // Clickjacking. frame-ancestors above is the modern equivalent; both are set
  // because X-Frame-Options is still what older browsers honour.
  'X-Frame-Options': 'SAMEORIGIN',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  'Content-Security-Policy-Report-Only': CSP_REPORT_ONLY,
}

// HSTS is only meaningful over HTTPS, and setting it on http://localhost would
// pin the browser to HTTPS for local dev — so gate it on the request protocol.
const HSTS = 'max-age=31536000; includeSubDomains'

export function withSecurityHeaders(
  request: Request,
  response: Response,
): Response {
  // Re-wrap rather than mutate: a streamed Response's headers are immutable
  // once constructed. Passing `response.body` through keeps streaming intact.
  const headers = new Headers(response.headers)

  for (const [key, value] of Object.entries(HEADERS)) {
    if (!headers.has(key)) headers.set(key, value)
  }

  if (new URL(request.url).protocol === 'https:') {
    if (!headers.has('Strict-Transport-Security')) {
      headers.set('Strict-Transport-Security', HSTS)
    }
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}
