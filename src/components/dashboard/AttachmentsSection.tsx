import { useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { FileAttachmentIcon } from 'hugeicons-react'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Textarea } from '#/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { ConfirmDialog } from '#/components/dashboard/ConfirmDialog'
import { cn } from '#/lib/utils'
import { uploadToR2 } from '#/server/upload'
import {
  listStudentAttachments,
  addStudentAttachment,
  deleteStudentAttachment,
} from '#/server/studentAttachments'
import type { AttachmentType } from '#/server/studentAttachments'
import {
  listStaffAttachments,
  addStaffAttachment,
  deleteStaffAttachment,
} from '#/server/staffAttachments'

const R2_BASE_URL = import.meta.env.VITE_R2_BASE_URL ?? ''

function resolveUrl(url: string): string {
  if (url.startsWith('http') || url.startsWith('data:')) return url
  const base = R2_BASE_URL.endsWith('/') ? R2_BASE_URL : `${R2_BASE_URL}/`
  const path = url.startsWith('/') ? url.slice(1) : url
  return `${base}${path}`
}

interface Attachment {
  id: number
  title: string
  description: string | null
  attachmentUrl: string
  attachmentType: AttachmentType
  createdAt: Date | null
}

interface Props {
  profileId: number
  entityType: 'student' | 'staff'
}

export function AttachmentsSection({ profileId, entityType }: Props) {
  const queryClient = useQueryClient()
  const queryKey = [
    entityType === 'student' ? 'student-attachments' : 'staff-attachments',
    profileId,
  ]

  const [addOpen, setAddOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [mode, setMode] = useState<'file' | 'link'>('file')
  const [file, setFile] = useState<File | null>(null)
  const [linkUrl, setLinkUrl] = useState('')
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: attachments = [] } = useQuery({
    queryKey,
    queryFn: () =>
      entityType === 'student'
        ? (listStudentAttachments({
            data: { studentProfileId: profileId },
          }) as Promise<Attachment[]>)
        : (listStaffAttachments({
            data: { staffProfileId: profileId },
          }) as Promise<Attachment[]>),
  })

  const resetForm = () => {
    setTitle('')
    setDescription('')
    setMode('file')
    setFile(null)
    setLinkUrl('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const addMutation = useMutation({
    mutationFn: async () => {
      let attachmentUrl: string
      let attachmentType: AttachmentType

      if (mode === 'file') {
        if (!file) throw new Error('No file selected')
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = (e) => {
            const result = e.target?.result as string
            resolve(result.split(',')[1])
          }
          reader.onerror = reject
          reader.readAsDataURL(file)
        })
        const folder = entityType === 'student' ? 'student-docs' : 'staff-docs'
        const result = await uploadToR2({
          data: {
            file: base64,
            fileName: file.name,
            mimeType: file.type,
            folder,
          },
        })
        attachmentUrl = result.url
        attachmentType = 'file'
      } else {
        if (!linkUrl.trim()) throw new Error('No URL entered')
        attachmentUrl = linkUrl.trim()
        attachmentType = 'link'
      }

      const payload = {
        profileId,
        title: title.trim(),
        description: description.trim() || null,
        attachmentUrl,
        attachmentType,
      }

      if (entityType === 'student') {
        return addStudentAttachment({
          data: { studentProfileId: payload.profileId, ...payload },
        })
      } else {
        return addStaffAttachment({
          data: { staffProfileId: payload.profileId, ...payload },
        })
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey })
      toast.success('Document added')
      resetForm()
      setAddOpen(false)
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to add document'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      entityType === 'student'
        ? deleteStudentAttachment({ data: { id } })
        : deleteStaffAttachment({ data: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey })
      toast.success('Document removed')
    },
    onError: () => toast.error('Failed to remove document'),
  })

  const canSubmit =
    title.trim().length > 0 &&
    (mode === 'file' ? !!file : linkUrl.trim().length > 0)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">Documents &amp; Attachments</CardTitle>
        {!addOpen && (
          <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>
            Add Document
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {addOpen && (
          <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
            <div className="space-y-1.5">
              <Label>
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Birth Certificate, 10th Marks Card"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional notes"
                rows={2}
                className="resize-none"
              />
            </div>
            <div className="space-y-2">
              <Label>Attachment</Label>
              <div className="flex gap-1">
                {(['file', 'link'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      setMode(m)
                      setFile(null)
                      setLinkUrl('')
                    }}
                    className={cn(
                      'rounded-md px-3 py-1 text-sm border transition-colors',
                      mode === m
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-input hover:bg-muted',
                    )}
                  >
                    {m === 'file' ? 'Upload file' : 'External link'}
                  </button>
                ))}
              </div>
              {mode === 'file' ? (
                <div className="space-y-1.5">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,application/pdf"
                    className="hidden"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  />
                  {file ? (
                    <div className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm">
                      <FileAttachmentIcon className="size-4 shrink-0 text-muted-foreground" />
                      <span className="truncate flex-1">{file.name}</span>
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          setFile(null)
                          if (fileInputRef.current)
                            fileInputRef.current.value = ''
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Choose file
                    </Button>
                  )}
                  <p className="text-xs text-muted-foreground">
                    JPG, PNG, PDF · Max 5 MB
                  </p>
                </div>
              ) : (
                <Input
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://drive.google.com/..."
                  type="url"
                />
              )}
            </div>
            <div className="flex gap-2 pt-1">
              <Button
                size="sm"
                disabled={!canSubmit || addMutation.isPending}
                onClick={() => addMutation.mutate()}
              >
                {addMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  resetForm()
                  setAddOpen(false)
                }}
                disabled={addMutation.isPending}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {attachments.length === 0 && !addOpen ? (
          <p className="text-sm text-muted-foreground">
            No documents attached yet.
          </p>
        ) : (
          <div className="divide-y">
            {attachments.map((att) => {
              const href =
                att.attachmentType === 'file'
                  ? resolveUrl(att.attachmentUrl)
                  : att.attachmentUrl
              return (
                <div
                  key={att.id}
                  className="flex items-start gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <FileAttachmentIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      {att.title}
                    </a>
                    {att.description && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {att.description}
                      </p>
                    )}
                    <p className="mt-0.5 text-xs text-muted-foreground capitalize">
                      {att.attachmentType === 'link' ? 'External link' : 'File'}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-destructive"
                    onClick={() => setDeleteId(att.id)}
                    disabled={deleteMutation.isPending}
                  >
                    Remove
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Remove document?"
        description="This will permanently remove this attachment."
        confirmLabel="Remove"
        onConfirm={() => {
          if (deleteId !== null) deleteMutation.mutate(deleteId)
          setDeleteId(null)
        }}
      />
    </Card>
  )
}
