// Types for the Cloudflare Worker's env bindings and execution context, as
// passed to the fetch handler in src/server.ts. Non-secret values are
// `vars` in wrangler.jsonc; secrets are set with `wrangler secret put`.

export interface WorkerEnv {
  // vars (wrangler.jsonc)
  BETTER_AUTH_URL?: string
  R2_ACCOUNT_ID?: string
  R2_BUCKET_NAME?: string
  RESEND_FROM_EMAIL?: string
  CONTACT_NOTIFICATION_EMAIL?: string
  // Poster QR redirect (/wa): WhatsApp target and GA4 property.
  WA_URL?: string
  GA4_MEASUREMENT_ID?: string

  // secrets (wrangler secret put)
  GA4_API_SECRET?: string
}

// The subset of Cloudflare's ExecutionContext this app uses.
export interface WorkerExecutionContext {
  waitUntil: (promise: Promise<unknown>) => void
}
