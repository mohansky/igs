import { createFileRoute, redirect } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import {
  listEnquiries,
  createEnquiry,
  updateEnquiry,
  deleteEnquiry,
  type EnquiryStatus,
  type Enquiry,
} from '#/server/enquiries'
import { Card, CardContent, CardDescription } from '#/components/ui/card'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Skeleton } from '#/components/ui/skeleton'
import { Textarea } from '#/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '#/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { cn } from '#/lib/utils'
import { toast } from 'sonner'

export const Route = createFileRoute('/dashboard/enquiries')({
  beforeLoad: ({ context }) => {
    const userRole =
      (context.session.user as { role?: string }).role ?? 'student'
    if (!['admin', 'staff'].includes(userRole)) {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: EnquiriesPage,
})

const STATUS_OPTIONS: EnquiryStatus[] = [
  'new',
  'visit-scheduled',
  'visited',
  'applied',
  'closed',
]

const STATUS_COLORS: Record<EnquiryStatus, string> = {
  new: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  'visit-scheduled':
    'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  visited:
    'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  applied:
    'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  closed: 'bg-gray-100 text-gray-600 dark:bg-gray-800/30 dark:text-gray-400',
}

const STATUS_LABELS: Record<EnquiryStatus, string> = {
  new: 'New',
  'visit-scheduled': 'Visit Scheduled',
  visited: 'Visited',
  applied: 'Applied',
  closed: 'Closed',
}

const SOURCE_OPTIONS = [
  'Word of mouth',
  'Google',
  'Social media',
  'Hoarding / banner',
  'School event',
  'Other',
]

const today = () => new Date().toISOString().slice(0, 10)

const emptyForm = () => ({
  childName: '',
  childDob: '',
  parentName: '',
  parentOccupation: '',
  parentPhone: '',
  parentEmail: '',
  address: '',
  enquiryDate: today(),
  source: '',
  visitDate: '',
  visitTime: '',
  notes: '',
})

function formatDate(d: string | null | undefined) {
  if (!d) return '—'
  try {
    return format(parseISO(d), 'dd MMM yyyy')
  } catch {
    return d
  }
}

// ── New Enquiry Dialog ────────────────────────────────────────

function NewEnquiryDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }))

  const mutation = useMutation({
    mutationFn: () =>
      createEnquiry({
        data: {
          childName: form.childName.trim(),
          childDob: form.childDob || null,
          parentName: form.parentName.trim(),
          parentOccupation: form.parentOccupation || null,
          parentPhone: form.parentPhone.trim(),
          parentEmail: form.parentEmail || null,
          address: form.address || null,
          enquiryDate: form.enquiryDate,
          source: form.source || null,
          visitDate: form.visitDate || null,
          visitTime: form.visitTime || null,
          notes: form.notes || null,
        },
      }),
    onSuccess: () => {
      toast.success('Enquiry added')
      setOpen(false)
      setForm(emptyForm)
      onCreated()
    },
    onError: () => toast.error('Failed to add enquiry'),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (
      !form.childName ||
      !form.parentName ||
      !form.parentPhone ||
      !form.enquiryDate
    ) {
      toast.error(
        'Child name, parent name, phone and enquiry date are required',
      )
      return
    }
    mutation.mutate()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">+ New Enquiry</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>New Enquiry</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Child */}
          <div>
            <p className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Child
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Name *</Label>
                <Input
                  value={form.childName}
                  onChange={(e) => set('childName', e.target.value)}
                  placeholder="Child's full name"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Date of Birth</Label>
                <Input
                  type="date"
                  value={form.childDob}
                  onChange={(e) => set('childDob', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Parent */}
          <div>
            <p className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Parent / Guardian
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Name *</Label>
                <Input
                  value={form.parentName}
                  onChange={(e) => set('parentName', e.target.value)}
                  placeholder="Parent's full name"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Occupation</Label>
                <Input
                  value={form.parentOccupation}
                  onChange={(e) => set('parentOccupation', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Phone *</Label>
                <Input
                  type="tel"
                  value={form.parentPhone}
                  onChange={(e) => set('parentPhone', e.target.value)}
                  placeholder="+91 …"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={form.parentEmail}
                  onChange={(e) => set('parentEmail', e.target.value)}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Address</Label>
                <Input
                  value={form.address}
                  onChange={(e) => set('address', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Enquiry */}
          <div>
            <p className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Enquiry Details
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Enquiry Date *</Label>
                <Input
                  type="date"
                  value={form.enquiryDate}
                  onChange={(e) => set('enquiryDate', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>How did they hear about us?</Label>
                <Select
                  value={form.source}
                  onValueChange={(v) => set('source', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent>
                    {SOURCE_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Campus Visit Date</Label>
                <Input
                  type="date"
                  value={form.visitDate}
                  onChange={(e) => set('visitDate', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Visit Time</Label>
                <Input
                  type="time"
                  value={form.visitTime}
                  onChange={(e) => set('visitTime', e.target.value)}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Notes</Label>
                <Textarea
                  rows={3}
                  value={form.notes}
                  onChange={(e) => set('notes', e.target.value)}
                  placeholder="Any internal notes…"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving…' : 'Save Enquiry'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Expanded Enquiry Card ─────────────────────────────────────

function EnquiryDetail({
  enquiry,
  userRole,
  onUpdate,
  onDelete,
}: {
  enquiry: Enquiry
  userRole: string
  onUpdate: () => void
  onDelete: () => void
}) {
  const [editNotes, setEditNotes] = useState(enquiry.notes ?? '')
  const [editVisitDate, setEditVisitDate] = useState(enquiry.visitDate ?? '')
  const [editVisitTime, setEditVisitTime] = useState(enquiry.visitTime ?? '')
  const [notesChanged, setNotesChanged] = useState(false)
  const [visitChanged, setVisitChanged] = useState(false)

  const updateMutation = useMutation({
    mutationFn: (
      updates: Parameters<typeof updateEnquiry>[0]['data']['updates'],
    ) => updateEnquiry({ data: { id: enquiry.id, updates } }),
    onSuccess: onUpdate,
    onError: () => toast.error('Update failed'),
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteEnquiry({ data: { id: enquiry.id } }),
    onSuccess: () => {
      toast.success('Enquiry deleted')
      onDelete()
    },
    onError: () => toast.error('Delete failed'),
  })

  return (
    <div
      className="mt-4 space-y-5 border-t pt-4 text-sm"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Details grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Detail label="Child DOB" value={formatDate(enquiry.childDob)} />
        <Detail label="Parent Occupation" value={enquiry.parentOccupation} />
        <Detail label="Phone">
          <a
            href={`tel:${enquiry.parentPhone}`}
            className="text-primary underline"
          >
            {enquiry.parentPhone}
          </a>
        </Detail>
        {enquiry.parentEmail && (
          <Detail label="Email">
            <a
              href={`mailto:${enquiry.parentEmail}`}
              className="text-primary underline"
            >
              {enquiry.parentEmail}
            </a>
          </Detail>
        )}
        <Detail label="Address" value={enquiry.address} />
        <Detail label="Source" value={enquiry.source} />
        <Detail label="Enquiry Date" value={formatDate(enquiry.enquiryDate)} />
      </div>

      {/* Visit appointment */}
      <div className="rounded-lg border p-3 space-y-3">
        <p className="font-medium">Campus Visit Appointment</p>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Date</Label>
            <Input
              type="date"
              className="h-8 text-sm"
              value={editVisitDate}
              onChange={(e) => {
                setEditVisitDate(e.target.value)
                setVisitChanged(true)
              }}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Time</Label>
            <Input
              type="time"
              className="h-8 text-sm"
              value={editVisitTime}
              onChange={(e) => {
                setEditVisitTime(e.target.value)
                setVisitChanged(true)
              }}
            />
          </div>
          {visitChanged && (
            <Button
              size="sm"
              onClick={() => {
                updateMutation.mutate({
                  visitDate: editVisitDate || null,
                  visitTime: editVisitTime || null,
                  status: editVisitDate
                    ? 'visit-scheduled'
                    : (enquiry.status as EnquiryStatus),
                })
                setVisitChanged(false)
              }}
              disabled={updateMutation.isPending}
            >
              Save
            </Button>
          )}
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Internal Notes</Label>
        <Textarea
          rows={3}
          value={editNotes}
          onChange={(e) => {
            setEditNotes(e.target.value)
            setNotesChanged(true)
          }}
          placeholder="Add notes…"
        />
        {notesChanged && (
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={() => {
                updateMutation.mutate({ notes: editNotes || null })
                setNotesChanged(false)
              }}
              disabled={updateMutation.isPending}
            >
              Save Notes
            </Button>
          </div>
        )}
      </div>

      {/* Status buttons */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((s) => (
            <Button
              key={s}
              size="sm"
              variant={enquiry.status === s ? 'default' : 'outline'}
              disabled={enquiry.status === s || updateMutation.isPending}
              onClick={() => updateMutation.mutate({ status: s })}
            >
              {STATUS_LABELS[s]}
            </Button>
          ))}
        </div>
        {userRole === 'admin' && (
          <Button
            size="sm"
            variant="destructive"
            disabled={deleteMutation.isPending}
            onClick={() => {
              if (confirm(`Delete enquiry for ${enquiry.childName}?`)) {
                deleteMutation.mutate()
              }
            }}
          >
            Delete
          </Button>
        )}
      </div>
    </div>
  )
}

function Detail({
  label,
  value,
  children,
}: {
  label: string
  value?: string | null
  children?: React.ReactNode
}) {
  const content = children ?? value ?? '—'
  return (
    <div>
      <span className="font-medium text-muted-foreground">{label}</span>
      <p className="mt-0.5">{content}</p>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────

function EnquiriesPage() {
  const { session } = Route.useRouteContext()
  const userRole = (session.user as { role?: string }).role ?? 'staff'
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<EnquiryStatus | 'all'>('all')
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['enquiries'],
    queryFn: () => listEnquiries(),
  })

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['enquiries'] })

  const filtered =
    filter === 'all' ? items : items.filter((e) => e.status === filter)

  const counts = {
    all: items.length,
    ...Object.fromEntries(
      STATUS_OPTIONS.map((s) => [
        s,
        items.filter((e) => e.status === s).length,
      ]),
    ),
  } as Record<'all' | EnquiryStatus, number>

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Enquiries</h1>
          <p className="text-sm text-muted-foreground">
            Prospective families who have reached out
          </p>
        </div>
        <NewEnquiryDialog onCreated={invalidate} />
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {(['all', ...STATUS_OPTIONS] as const).map((s) => (
          <Button
            key={s}
            variant={filter === s ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(s)}
          >
            <span className="capitalize">
              {s === 'all' ? 'All' : STATUS_LABELS[s]}
            </span>
            <span className="ml-1.5 rounded-full bg-background/20 px-1.5 text-xs">
              {counts[s]}
            </span>
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-4 w-56" />
                  </div>
                  <Skeleton className="h-3 w-24" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CardDescription>No enquiries found</CardDescription>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((enq) => {
            const isExpanded = expandedId === enq.id
            const status = enq.status as EnquiryStatus
            return (
              <Card
                key={enq.id}
                className={cn(
                  'cursor-pointer transition-shadow hover:shadow-md p-0',
                  status === 'new' && 'border-l-4 border-l-chart-2',
                )}
                onClick={() => setExpandedId(isExpanded ? null : enq.id)}
              >
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold truncate">
                          {enq.childName}
                        </span>
                        <span
                          className={cn(
                            'inline-flex shrink-0 rounded-full px-2 py-0.5 text-xs font-medium',
                            STATUS_COLORS[status],
                          )}
                        >
                          {STATUS_LABELS[status]}
                        </span>
                        {enq.visitDate && (
                          <span className="text-xs text-muted-foreground">
                            Visit: {formatDate(enq.visitDate)}
                            {enq.visitTime ? ` · ${enq.visitTime}` : ''}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {enq.parentName}
                        {enq.parentPhone ? ` · ${enq.parentPhone}` : ''}
                        {enq.source ? ` · ${enq.source}` : ''}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {enq.enquiryDate ? formatDate(enq.enquiryDate) : '—'}
                    </span>
                  </div>

                  {isExpanded && (
                    <EnquiryDetail
                      enquiry={enq}
                      userRole={userRole}
                      onUpdate={() => {
                        invalidate()
                      }}
                      onDelete={() => {
                        setExpandedId(null)
                        invalidate()
                      }}
                    />
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
