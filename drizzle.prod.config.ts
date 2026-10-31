import { config } from 'dotenv'
import { defineConfig } from 'drizzle-kit'

// Production only — used by `pnpm db:push:prod`. Reads .env.prod.local and
// nothing else, so it can never silently fall back to the staging values in
// .env.local. (Not .env.production.local: Vite auto-loads that during builds.)
config({ path: '.env.prod.local', override: true })

const url = process.env.DATABASE_URL
if (!url) {
  throw new Error(
    'DATABASE_URL is not set in .env.prod.local — refusing to run against production.',
  )
}
console.log(`\n⚠️  PRODUCTION database: ${new URL(url).host}\n`)

export default defineConfig({
  out: './drizzle',
  schema: './src/db/schema.ts',
  dialect: 'turso',
  dbCredentials: {
    url,
    authToken: process.env.DATABASE_AUTH_TOKEN,
  },
})
