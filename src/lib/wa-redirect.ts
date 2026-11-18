// /wa: the target of the printed Playgroup poster's QR code. Redirects
// straight to WhatsApp and, without delaying the redirect, records a GA4
// event (Measurement Protocol) so poster scans can be counted.
//
// Handled at the top of the Worker's fetch handler (src/server.ts), before
// TanStack Start, so it never renders a page and is never cached.

import type { WorkerEnv, WorkerExecutionContext } from '#/worker-env'

export const WA_PATH = '/wa'

// Used if the WA_URL var is missing, so the poster never breaks.
export const DEFAULT_WA_URL =
  'https://wa.me/918050718044?text=Hi%2C%20I%27d%20like%20to%20know%20about%20Playgroup%20admissions%20at%20IGS'

export const GA4_EVENT_NAME = 'poster_qr_scan'
const GA4_ENDPOINT = 'https://www.google-analytics.com/mp/collect'
// GA4 drops event parameter values longer than 100 characters.
const GA4_MAX_PARAM_LENGTH = 100

// Link previewers (WhatsApp, Facebook, Slack...) and crawlers fetch the
// URL without a person behind it, so they get the redirect but no event.
// The generic "bot" check needs a word start or a following / or - (as in
// "Googlebot/2.1", "AdsBot-Google"), so phone names like "CUBOT X30" pass.
const BOT_USER_AGENT =
  /whatsapp|facebookexternalhit|twitterbot|slackbot|googlebot|bingbot|\bbot\b|bot[/-]|crawler|spider/i

export function isWaRequest(url: URL): boolean {
  return url.pathname === WA_PATH || url.pathname === `${WA_PATH}/`
}

export function isBot(userAgent: string | null): boolean {
  return !!userAgent && BOT_USER_AGENT.test(userAgent)
}

// Event params: source and campaign, plus any utm_* params on the request.
export function scanEventParams(url: URL): Record<string, string> {
  const params: Record<string, string> = {
    source: 'poster',
    campaign: 'playgroup',
  }
  for (const [key, value] of url.searchParams) {
    if (/^utm_[a-z0-9_]+$/i.test(key) && value) {
      params[key.toLowerCase()] = value.slice(0, GA4_MAX_PARAM_LENGTH)
    }
  }
  return params
}

async function sendScanEvent(url: URL, env: WorkerEnv): Promise<void> {
  const measurementId = env.GA4_MEASUREMENT_ID
  const apiSecret = env.GA4_API_SECRET
  if (!measurementId || !apiSecret) return

  const endpoint = new URL(GA4_ENDPOINT)
  endpoint.searchParams.set('measurement_id', measurementId)
  endpoint.searchParams.set('api_secret', apiSecret)

  await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      // No cookie to read on a QR scan, so every scan is its own client.
      client_id: crypto.randomUUID(),
      events: [{ name: GA4_EVENT_NAME, params: scanEventParams(url) }],
    }),
  })
}

export function handleWaRequest(
  request: Request,
  env: WorkerEnv | undefined,
  ctx: WorkerExecutionContext | undefined,
): Response {
  const url = new URL(request.url)

  // Count real GET scans only: not HEAD (e.g. curl -I), not previewers/bots.
  if (
    env &&
    ctx &&
    request.method === 'GET' &&
    !isBot(request.headers.get('User-Agent'))
  ) {
    try {
      ctx.waitUntil(sendScanEvent(url, env).catch(() => {}))
    } catch {
      // Analytics must never break the redirect.
    }
  }

  return new Response(null, {
    status: 302,
    headers: {
      Location: env?.WA_URL || DEFAULT_WA_URL,
      'Cache-Control': 'no-store',
    },
  })
}
