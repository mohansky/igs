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

import { sql } from 'drizzle-orm'
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
  // drizzle-kit 0.31's libsql push has created fee_categories without its
  // unique index on key, and later pushes then fail on `DROP INDEX` for it.
  // Create it here (a no-op if it exists) so every database has it.
  await db.run(
    sql`CREATE UNIQUE INDEX IF NOT EXISTS fee_categories_key_idx ON fee_categories (key)`,
  )
  console.log('Unique index on fee_categories.key: ok')

  // Check existing keys rather than ON CONFLICT, so this works the same
  // with or without that index.
  const existing = await db
    .select({ key: feeCategories.key })
    .from(feeCategories)
  const have = new Set(existing.map((r) => r.key))
  const missing = DEFAULT_FEE_CATEGORIES.map((c, i) => ({
    key: c.key,
    name: c.name,
    isPassThrough: c.isPassThrough,
    sortOrder: i,
  })).filter((c) => !have.has(c.key))
  if (missing.length === 0) {
    console.log('All default categories already exist; nothing changed.')
    return
  }
  const inserted = await db
    .insert(feeCategories)
    .values(missing)
    .returning({ name: feeCategories.name })
  console.log(`Added: ${inserted.map((r) => r.name).join(', ')}`)
}

main().then(() => process.exit(0))
