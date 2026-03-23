import { config } from 'dotenv'
config({ path: ['.env.local', '.env'] })

import { createClient } from '@libsql/client'
import { hashPassword } from 'better-auth/crypto'
import crypto from 'crypto'

const email = 'mohansky@gmail.com'
const password = 'admin1234'
const name = 'Mohan'

async function main() {
  const client = createClient({ url: process.env.DATABASE_URL! })

  // Check if admin already exists
  const existing = await client.execute({
    sql: 'SELECT id FROM user WHERE email = ?',
    args: [email],
  })

  if (existing.rows.length > 0) {
    console.log('Admin user already exists, updating role and password...')
    const hashedPassword = await hashPassword(password)
    await client.execute({
      sql: 'UPDATE user SET role = ? WHERE email = ?',
      args: ['admin', email],
    })
    await client.execute({
      sql: 'UPDATE account SET password = ? WHERE userId = (SELECT id FROM user WHERE email = ?)',
      args: [hashedPassword, email],
    })
    console.log('Done.')
    return
  }

  const userId = crypto.randomUUID()
  const now = new Date().toISOString()
  const hashedPassword = await hashPassword(password)

  await client.execute({
    sql: 'INSERT INTO user (id, name, email, emailVerified, role, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
    args: [userId, name, email, 0, 'admin', now, now],
  })

  const accountId = crypto.randomUUID()
  await client.execute({
    sql: 'INSERT INTO account (id, accountId, providerId, userId, password, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
    args: [accountId, userId, 'credential', userId, hashedPassword, now, now],
  })

  console.log('Admin user created:', { id: userId, name, email, role: 'admin' })
}

main().catch(console.error)
