import { config } from 'dotenv'
import { defineConfig } from 'drizzle-kit'

config({ path: ['.env.local', '.env'] })

// .env.local is meant to point at the staging branch; production goes through
// drizzle.prod.config.ts (`pnpm db:push:prod`).
if (process.env.DATABASE_URL) {
  console.log(`\nDatabase: ${new URL(process.env.DATABASE_URL).host}\n`)
}

export default defineConfig({
  out: './drizzle',
  schema: './src/db/schema.ts',
  dialect: 'turso',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
    authToken: process.env.DATABASE_AUTH_TOKEN,
  },
})
