// Custom server entry — mirrors @tanstack/react-start's default entry, but
// wraps every response with security headers. Referenced by wrangler.jsonc `main`.
import {
  createStartHandler,
  defaultStreamHandler,
} from '@tanstack/react-start/server'
import type { Register } from '@tanstack/react-router'
import type { RequestHandler } from '@tanstack/react-start/server'
import { withSecurityHeaders } from '#/lib/security-headers'
import { handleWaRequest, isWaRequest } from '#/lib/wa-redirect'
import type { WorkerEnv, WorkerExecutionContext } from '#/worker-env'

const fetch = createStartHandler(defaultStreamHandler)

export type ServerEntry = { fetch: RequestHandler<Register> }

export default {
  async fetch(request, ...rest) {
    // Poster QR code: redirect to WhatsApp before TanStack Start sees the
    // request (no page render, no caching). Cloudflare calls this handler
    // as fetch(request, env, ctx).
    if (
      (request.method === 'GET' || request.method === 'HEAD') &&
      isWaRequest(new URL(request.url))
    ) {
      const [env, ctx] = rest as unknown as [
        WorkerEnv | undefined,
        WorkerExecutionContext | undefined,
      ]
      return withSecurityHeaders(request, handleWaRequest(request, env, ctx))
    }

    const response = await fetch(request, ...rest)
    return withSecurityHeaders(request, response)
  },
} satisfies ServerEntry
