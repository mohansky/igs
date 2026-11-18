import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_WA_URL,
  GA4_EVENT_NAME,
  handleWaRequest,
  isBot,
  isWaRequest,
  scanEventParams,
} from './wa-redirect'
import type { WorkerEnv } from '#/worker-env'

const PHONE_UA =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36'

const env: WorkerEnv = {
  WA_URL: 'https://wa.me/910000000000?text=hello',
  GA4_MEASUREMENT_ID: 'G-TEST123',
  GA4_API_SECRET: 'secret',
}

function makeCtx() {
  const pending: Promise<unknown>[] = []
  return {
    ctx: { waitUntil: (p: Promise<unknown>) => void pending.push(p) },
    settle: () => Promise.all(pending),
    pending,
  }
}

function req(path: string, init: RequestInit & { ua?: string } = {}) {
  const { ua = PHONE_UA, ...rest } = init
  return new Request(`https://indogermanschool.com${path}`, {
    ...rest,
    headers: { 'User-Agent': ua },
  })
}

afterEach(() => vi.unstubAllGlobals())

describe('isWaRequest', () => {
  it('matches /wa and /wa/ only', () => {
    expect(isWaRequest(new URL('https://x.com/wa'))).toBe(true)
    expect(isWaRequest(new URL('https://x.com/wa/'))).toBe(true)
    expect(isWaRequest(new URL('https://x.com/wa?utm_source=a'))).toBe(true)
    expect(isWaRequest(new URL('https://x.com/wall'))).toBe(false)
    expect(isWaRequest(new URL('https://x.com/dashboard/wa'))).toBe(false)
  })
})

describe('isBot', () => {
  it('flags link previewers and crawlers', () => {
    for (const ua of [
      'WhatsApp/2.23.20.0 A',
      'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
      'Twitterbot/1.0',
      'Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)',
      'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
      'AdsBot-Google (+http://www.google.com/adsbot.html)',
      'Some Crawler 1.0',
      'MySpider/3.0',
    ]) {
      expect(isBot(ua), ua).toBe(true)
    }
  })

  it('lets phones through, including brand names containing "bot"', () => {
    expect(isBot(PHONE_UA)).toBe(false)
    expect(
      isBot(
        'Mozilla/5.0 (Linux; Android 10; CUBOT X30) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36',
      ),
    ).toBe(false)
    expect(isBot(null)).toBe(false)
  })
})

describe('scanEventParams', () => {
  it('adds utm_* params to source and campaign', () => {
    const params = scanEventParams(
      new URL(
        'https://x.com/wa?utm_source=poster&utm_medium=print&UTM_Content=gate&ref=x',
      ),
    )
    expect(params).toEqual({
      source: 'poster',
      campaign: 'playgroup',
      utm_source: 'poster',
      utm_medium: 'print',
      utm_content: 'gate',
    })
  })

  it('caps values at 100 characters', () => {
    const params = scanEventParams(
      new URL(`https://x.com/wa?utm_term=${'a'.repeat(150)}`),
    )
    expect(params.utm_term).toHaveLength(100)
  })
})

describe('handleWaRequest', () => {
  it('redirects with no-store and sends the GA4 event in the background', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null))
    vi.stubGlobal('fetch', fetchMock)
    const { ctx, settle } = makeCtx()

    const res = handleWaRequest(req('/wa?utm_medium=print'), env, ctx)
    expect(res.status).toBe(302)
    expect(res.headers.get('Location')).toBe(env.WA_URL)
    expect(res.headers.get('Cache-Control')).toBe('no-store')

    await settle()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as [URL, RequestInit]
    expect(url.origin + url.pathname).toBe(
      'https://www.google-analytics.com/mp/collect',
    )
    expect(url.searchParams.get('measurement_id')).toBe('G-TEST123')
    expect(url.searchParams.get('api_secret')).toBe('secret')
    const body = JSON.parse(init.body as string)
    expect(body.client_id).toMatch(/^\d+\.\d+$/)
    expect(body.events).toEqual([
      {
        name: GA4_EVENT_NAME,
        params: {
          source: 'poster',
          campaign: 'playgroup',
          utm_medium: 'print',
        },
      },
    ])
  })

  it('uses a new client_id per request', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null))
    vi.stubGlobal('fetch', fetchMock)
    const { ctx, settle } = makeCtx()
    handleWaRequest(req('/wa'), env, ctx)
    handleWaRequest(req('/wa'), env, ctx)
    await settle()
    const ids = fetchMock.mock.calls.map(
      ([, init]) => JSON.parse((init as RequestInit).body as string).client_id,
    )
    expect(ids[0]).not.toBe(ids[1])
  })

  it('skips the event for HEAD and bots but still redirects', () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const { ctx, pending } = makeCtx()

    const head = handleWaRequest(req('/wa', { method: 'HEAD' }), env, ctx)
    const bot = handleWaRequest(req('/wa', { ua: 'WhatsApp/2.23' }), env, ctx)

    expect(head.status).toBe(302)
    expect(bot.status).toBe(302)
    expect(pending).toHaveLength(0)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('still redirects when GA4 fails or config is missing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('down')))
    const { ctx, settle } = makeCtx()
    const res = handleWaRequest(req('/wa'), env, ctx)
    expect(res.status).toBe(302)
    await expect(settle()).resolves.toBeDefined()

    // No env at all (e.g. local dev): default target, no event.
    const bare = handleWaRequest(req('/wa'), undefined, undefined)
    expect(bare.status).toBe(302)
    expect(bare.headers.get('Location')).toBe(DEFAULT_WA_URL)

    // A waitUntil that throws must not break the redirect either.
    const throwing = handleWaRequest(req('/wa'), env, {
      waitUntil: () => {
        throw new Error('no ctx')
      },
    })
    expect(throwing.status).toBe(302)
  })

  it('sends nothing when the measurement ID or secret is missing', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const { ctx, settle } = makeCtx()
    handleWaRequest(req('/wa'), { ...env, GA4_MEASUREMENT_ID: '' }, ctx)
    handleWaRequest(req('/wa'), { ...env, GA4_API_SECRET: undefined }, ctx)
    await settle()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
