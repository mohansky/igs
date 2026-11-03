// Seed the default fee categories. Run once per database after `db:push`:
//   pnpm db:seed:categories        (staging, .env.local)
//   pnpm db:seed:categories:prod   (production, .env.prod.local)
// Idempotent: only adds defaults whose key is missing, never changes existing
// rows, so renames/reordering/deactivation done in the app are kept.
import { config } from 'dotenv'

const PROD = process.argv.includes('--prod')
if (PROD) {
  config({ path: '.env.prod.local', override: true })
} else {
  config({ path: ['.env.local', '.env'] })
}
if (!process.env.DATABASE_URL) {
  console.error(
    `DATABASE_URL is not set in ${PROD ? '.env.prod.local' : '.env.local'}.`,
  )
  process.exit(1)
}
console.log(
  `${PROD ? '⚠️  PRODUCTION' : 'Staging'} database: ${new URL(process.env.DATABASE_URL).host}`,
)

import { drizzle } from 'drizzle-orm/libsql'
import { feeCategories } from './schema'
import { DEFAULT_FEE_CATEGORIES } from '../lib/fee-categories'

const db = drizzle({
  connection: {
    url: process.env.DATABASE_URL,
    authToken: process.env.DATABASE_AUTH_TOKEN,
  },
})

async function main() {
  const inserted = await db
    .insert(feeCategories)
    .values(
      DEFAULT_FEE_CATEGORIES.map((c, i) => ({
        key: c.key,
        name: c.name,
        isPassThrough: c.isPassThrough,
        sortOrder: i,
      })),
    )
    .onConflictDoNothing({ target: feeCategories.key })
    .returning({ name: feeCategories.name })
  console.log(
    inserted.length > 0
      ? `Added: ${inserted.map((r) => r.name).join(', ')}`
      : 'All default categories already exist; nothing changed.',
  )
}

main().then(() => process.exit(0))
