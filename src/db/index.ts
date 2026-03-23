import { drizzle, type LibSQLDatabase } from 'drizzle-orm/libsql'

import * as schema from './schema.ts'

let _db: LibSQLDatabase<typeof schema> | null = null

export const db = new Proxy({} as LibSQLDatabase<typeof schema>, {
  get(_target, prop) {
    if (!_db) {
      _db = drizzle({
        connection: {
          url: process.env.DATABASE_URL!,
          authToken: process.env.DATABASE_AUTH_TOKEN,
        },
        schema,
      })
    }
    return (_db as unknown as Record<string | symbol, unknown>)[prop]
  },
})
