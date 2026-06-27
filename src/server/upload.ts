import { createServerFn } from '@tanstack/react-start'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { z } from 'zod'
import { requireRole } from './auth-utils'

function getR2Client() {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  })
}

const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'application/pdf',
]
const MAX_SIZE = 5 * 1024 * 1024 // 5 MB

// Only these destination folders may be written to. Prevents arbitrary keys
// (and path traversal) in the bucket.
const ALLOWED_FOLDERS = [
  'students',
  'staff',
  'student-docs',
  'staff-docs',
  'fee-receipts',
  'receipts',
  'avatars',
  'blog',
] as const

const uploadSchema = z.object({
  file: z.string().min(1), // base64 encoded file
  fileName: z.string().min(1).max(255),
  mimeType: z.enum(ALLOWED_TYPES as [string, ...string[]]),
  folder: z.enum(ALLOWED_FOLDERS),
})

export const uploadToR2 = createServerFn({ method: 'POST' })
  .inputValidator(uploadSchema)
  .handler(async ({ data }) => {
    await requireRole(['admin', 'staff'])

    const buffer = Buffer.from(data.file, 'base64')

    if (buffer.length > MAX_SIZE) {
      throw new Error(`File too large. Maximum size is 5 MB.`)
    }

    // Generate a unique key: folder/timestamp-randomid.ext
    // Strip any path separators from the extension as a defense-in-depth measure.
    const ext = (data.fileName.split('.').pop() ?? 'jpg').replace(
      /[^a-z0-9]/gi,
      '',
    )
    const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const key = `${data.folder}/${uniqueId}.${ext}`

    const client = getR2Client()
    await client.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: key,
        Body: buffer,
        ContentType: data.mimeType,
      }),
    )

    // Return the relative path (Image component resolves via R2_BASE_URL)
    return { key, url: `/${key}` }
  })
