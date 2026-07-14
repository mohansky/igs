// Custom server entry — mirrors @tanstack/react-start's default entry, but
// wraps every response with security headers. Referenced by wrangler.jsonc `main`.
import {
  createStartHandler,
  defaultStreamHandler,
} from '@tanstack/react-start/server'
import type { Register } from '@tanstack/react-router'
import type { RequestHandler } from '@tanstack/react-start/server'
import { withSecurityHeaders } from '#/lib/security-headers'

const fetch = createStartHandler(defaultStreamHandler)

export type ServerEntry = { fetch: RequestHandler<Register> }

export default {
  async fetch(request, ...rest) {
    const response = await fetch(request, ...rest)
    return withSecurityHeaders(request, response)
  },
} satisfies ServerEntry
