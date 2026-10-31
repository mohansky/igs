import { useMemo, useState } from 'react'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  ArrowDown01Icon,
  ArrowLeft01Icon,
  ArrowUp01Icon,
} from 'hugeicons-react'
import { Button } from '#/components/ui/button'
import { Card, CardContent } from '#/components/ui/card'
import { Skeleton } from '#/components/ui/skeleton'
import { Image } from '#/components/ui/image'
import {
  listGalleryItems,
  resetGalleryOrder,
  saveGalleryOrder,
} from '#/server/gallery'

export const Route = createFileRoute('/dashboard/gallery')({
  beforeLoad: ({ context }) => {
    const userRole =
      (context.session.user as { role?: string }).role ?? 'student'
    if (userRole !== 'admin') {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: GalleryOrderPage,
})

interface Row {
  key: string
  thumb: string
  title: string
  subtitle: string
  folderKey?: string
}

const fileName = (key: string) => key.split('/').pop() ?? key

function GalleryOrderPage() {
  const queryClient = useQueryClient()
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['galleryItems'],
    queryFn: () => listGalleryItems(),
  })

  const [openFolderKey, setOpenFolderKey] = useState<string | null>(null)
  const [draft, setDraft] = useState<string[] | null>(null)

  const openFolder = items.find(
    (i) => i.type === 'folder' && i.key === openFolderKey,
  )

  // The rows for the level being edited, in the order the public site shows.
  const rows: Row[] = useMemo(() => {
    if (openFolder?.type === 'folder') {
      return openFolder.images.map((key) => ({
        key,
        thumb: key,
        title: fileName(key),
        subtitle: openFolder.cover === key ? 'Cover photo' : 'Photo',
      }))
    }
    return items.map((item) =>
      item.type === 'folder'
        ? {
            key: item.key,
            thumb: item.cover,
            title: item.name,
            subtitle: `Folder · ${item.images.length} photo${item.images.length === 1 ? '' : 's'}`,
            folderKey: item.key,
          }
        : {
            key: item.key,
            thumb: item.src,
            title: fileName(item.key),
            subtitle: 'Photo',
          },
    )
  }, [items, openFolder])

  const rowByKey = new Map(rows.map((r) => [r.key, r]))
  const ordered = (draft ?? rows.map((r) => r.key))
    .map((k) => rowByKey.get(k))
    .filter((r): r is Row => !!r)
  const dirty = draft !== null

  const move = (index: number, delta: -1 | 1) => {
    const keys = ordered.map((r) => r.key)
    const target = index + delta
    if (target < 0 || target >= keys.length) return
    ;[keys[index], keys[target]] = [keys[target], keys[index]]
    setDraft(keys)
  }

  const afterChange = async (message: string) => {
    await queryClient.invalidateQueries({ queryKey: ['galleryItems'] })
    setDraft(null)
    toast.success(message)
  }

  const saveMutation = useMutation({
    mutationFn: (keys: string[]) => saveGalleryOrder({ data: { keys } }),
    onSuccess: () => afterChange('Gallery order saved'),
    onError: () => toast.error('Failed to save order'),
  })

  const resetMutation = useMutation({
    mutationFn: (keys: string[]) => resetGalleryOrder({ data: { keys } }),
    onSuccess: () => afterChange('Back to date order'),
    onError: () => toast.error('Failed to reset order'),
  })

  const busy = saveMutation.isPending || resetMutation.isPending

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Gallery Order</h1>
        <p className="text-sm text-muted-foreground">
          Use the arrows to set the order on the public gallery, then save.
          Anything you haven&apos;t ordered follows date order: new uploads
          appear at the top of the gallery, and new photos at the end of their
          folder.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {openFolder?.type === 'folder' && (
          <Button
            variant="outline"
            size="sm"
            disabled={dirty}
            onClick={() => {
              setOpenFolderKey(null)
              setDraft(null)
            }}
          >
            <ArrowLeft01Icon className="size-4" />
            All folders and photos
          </Button>
        )}
        <span className="text-sm font-medium">
          {openFolder?.type === 'folder'
            ? `Photos in ${openFolder.name}`
            : 'Top level'}
        </span>
        <div className="ml-auto flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={busy || rows.length === 0}
            onClick={() => resetMutation.mutate(rows.map((r) => r.key))}
          >
            Reset to date order
          </Button>
          {dirty && (
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => setDraft(null)}
            >
              Discard
            </Button>
          )}
          <Button
            size="sm"
            disabled={!dirty || busy}
            onClick={() => saveMutation.mutate(ordered.map((r) => r.key))}
          >
            {saveMutation.isPending ? 'Saving...' : 'Save order'}
          </Button>
        </div>
      </div>

      {dirty && (
        <p className="text-xs text-muted-foreground">
          Unsaved changes. Save or discard before switching folders.
        </p>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : ordered.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No photos in the gallery yet.
        </p>
      ) : (
        <div className="space-y-2">
          {ordered.map((row, index) => (
            <Card key={row.key} className="p-0">
              <CardContent className="flex items-center gap-3 p-2">
                <span className="w-6 text-center text-sm text-muted-foreground">
                  {index + 1}
                </span>
                <Image
                  src={row.thumb}
                  alt={row.title}
                  width={64}
                  height={64}
                  className="size-16 shrink-0 rounded"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{row.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {row.subtitle}
                  </p>
                </div>
                {row.folderKey && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={dirty}
                    onClick={() => setOpenFolderKey(row.folderKey!)}
                  >
                    Open
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Move up"
                  disabled={index === 0 || busy}
                  onClick={() => move(index, -1)}
                >
                  <ArrowUp01Icon className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Move down"
                  disabled={index === ordered.length - 1 || busy}
                  onClick={() => move(index, 1)}
                >
                  <ArrowDown01Icon className="size-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
