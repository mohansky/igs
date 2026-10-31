import { createServerFn } from '@tanstack/react-start'
import { ListObjectsV2Command } from '@aws-sdk/client-s3'
import { inArray, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '#/db'
import { galleryOrder } from '#/db/schema'
import { getR2Client } from './r2-client'
import { requireRole } from './auth-utils'

// Public — the gallery page is public-facing, and this only ever lists
// under gallery/, never the rest of the bucket (staff docs, receipts, etc).
const GALLERY_PREFIX = 'gallery/'
const IMAGE_EXTENSIONS = /\.(jpe?g|png|webp|avif|gif)$/i

export interface GalleryPhoto {
  key: string
  lastModified: number
}

export interface GalleryImageItem {
  type: 'image'
  key: string
  src: string
  lastModified: number
}

export interface GalleryFolderItem {
  type: 'folder'
  key: string
  name: string
  cover: string
  images: string[]
  lastModified: number
}

export type GalleryItem = GalleryImageItem | GalleryFolderItem

// "gallery/Independence-day-26/" -> "Independence Day 26"
function folderDisplayName(prefix: string) {
  return prefix
    .replace(GALLERY_PREFIX, '')
    .replace(/\/$/, '')
    .replace(/[-_]+/g, ' ')
    .trim()
    .split(' ')
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
    .join(' ')
}

// Top level: items with no saved position come first (newest first), so a
// newly uploaded event still surfaces at the top; then the manually ordered
// ones. Inside a folder: the manually ordered photos first, then any new ones
// in upload order (oldest first) at the end of the album.
function sortTopLevel<T extends { key: string; lastModified: number }>(
  items: T[],
  positions: Map<string, number>,
) {
  return [...items].sort((a, b) => {
    const pa = positions.get(a.key)
    const pb = positions.get(b.key)
    if (pa === undefined && pb === undefined)
      return b.lastModified - a.lastModified
    if (pa === undefined) return -1
    if (pb === undefined) return 1
    return pa - pb
  })
}

function sortFolderPhotos(photos: GalleryPhoto[], positions: Map<string, number>) {
  return [...photos].sort((a, b) => {
    const pa = positions.get(a.key)
    const pb = positions.get(b.key)
    if (pa !== undefined && pb !== undefined) return pa - pb
    if (pa !== undefined) return -1
    if (pb !== undefined) return 1
    return a.lastModified - b.lastModified || a.key.localeCompare(b.key)
  })
}

// Reads the live R2 bucket listing under gallery/ — a loose file becomes its
// own card, and a subfolder (e.g. gallery/Founders-Day-26/) becomes one
// "event" card, named from the folder name, covered by its first photo in
// display order, and opening into all of that folder's photos.
//
// Note: R2's ListObjectsV2 caps at 1000 keys per call with no pagination
// here — fine for a school gallery's realistic scale, but a single folder
// with 1000+ photos would be silently truncated.
export const listGalleryItems = createServerFn({ method: 'GET' }).handler(
  async (): Promise<GalleryItem[]> => {
    const client = getR2Client()
    const bucket = process.env.R2_BUCKET_NAME!

    const [top, orderRows] = await Promise.all([
      client.send(
        new ListObjectsV2Command({
          Bucket: bucket,
          Prefix: GALLERY_PREFIX,
          Delimiter: '/',
        }),
      ),
      db.select().from(galleryOrder),
    ])
    const positions = new Map(orderRows.map((r) => [r.key, r.position]))

    const looseImages: GalleryImageItem[] = (top.Contents ?? [])
      .filter(
        (obj) =>
          obj.Key &&
          obj.Key !== GALLERY_PREFIX &&
          IMAGE_EXTENSIONS.test(obj.Key),
      )
      .map((obj) => ({
        type: 'image' as const,
        key: obj.Key!,
        src: obj.Key!,
        lastModified: obj.LastModified?.getTime() ?? 0,
      }))

    const folderPrefixes = (top.CommonPrefixes ?? [])
      .map((p) => p.Prefix)
      .filter((p): p is string => !!p)

    const folders = await Promise.all(
      folderPrefixes.map(async (prefix): Promise<GalleryFolderItem> => {
        const inner = await client.send(
          new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix }),
        )

        const photos = sortFolderPhotos(
          (inner.Contents ?? [])
            .filter((obj) => obj.Key && IMAGE_EXTENSIONS.test(obj.Key))
            .map((obj) => ({
              key: obj.Key!,
              lastModified: obj.LastModified?.getTime() ?? 0,
            })),
          positions,
        )

        return {
          type: 'folder',
          key: prefix,
          name: folderDisplayName(prefix),
          cover: photos[0]?.key ?? '',
          images: photos.map((p) => p.key),
          lastModified: photos.reduce(
            (max, p) => Math.max(max, p.lastModified),
            0,
          ),
        }
      }),
    )

    return sortTopLevel<GalleryItem>(
      [...looseImages, ...folders.filter((f) => f.images.length > 0)],
      positions,
    )
  },
)

// ── Admin: manual ordering ──────────────────────────────────

const galleryKeys = z
  .array(
    z
      .string()
      .max(500)
      .refine(
        (k) => k.startsWith(GALLERY_PREFIX) && !k.includes('..'),
        'Not a gallery key',
      ),
  )
  .min(1)
  .max(1000)

// Saves one level's order: the full list of sibling keys (the top level, or
// one folder's photos) in display order. Positions are 0..n-1.
export const saveGalleryOrder = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ keys: galleryKeys }))
  .handler(async ({ data }) => {
    await requireRole(['admin'])
    await db
      .insert(galleryOrder)
      .values(
        data.keys.map((key, position) => ({
          key,
          position,
          updatedAt: new Date(),
        })),
      )
      .onConflictDoUpdate({
        target: galleryOrder.key,
        set: {
          position: sql`excluded.position`,
          updatedAt: sql`excluded.updated_at`,
        },
      })
    return { success: true }
  })

// Clears one level's saved order, putting it back to date order.
export const resetGalleryOrder = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ keys: galleryKeys }))
  .handler(async ({ data }) => {
    await requireRole(['admin'])
    await db.delete(galleryOrder).where(inArray(galleryOrder.key, data.keys))
    return { success: true }
  })
