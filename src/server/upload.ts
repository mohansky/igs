import { createServerFn } from '@tanstack/react-start'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

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
]
const MAX_SIZE = 5 * 1024 * 1024 // 5 MB

export const uploadToR2 = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      file: string // base64 encoded file
      fileName: string
      mimeType: string
      folder: string // e.g. "students", "blog"
    }) => data,
  )
  .handler(async ({ data }) => {
    if (!ALLOWED_TYPES.includes(data.mimeType)) {
      throw new Error(
        `Invalid file type: ${data.mimeType}. Allowed: ${ALLOWED_TYPES.join(', ')}`,
      )
    }

    const buffer = Buffer.from(data.file, 'base64')

    if (buffer.length > MAX_SIZE) {
      throw new Error(`File too large. Maximum size is 5 MB.`)
    }

    // Generate a unique key: folder/timestamp-randomid.ext
    const ext = data.fileName.split('.').pop() ?? 'jpg'
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
