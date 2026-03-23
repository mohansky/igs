import { createFileRoute } from '@tanstack/react-router'
import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  isWithinInterval,
  parseISO,
} from 'date-fns'
import { Button } from '#/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import { Badge } from '#/components/ui/badge'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '#/components/ui/alert-dialog'
import {
  listCalendarEvents,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} from '#/server/calendar'

export const Route = createFileRoute('/dashboard/calendar')({
  component: CalendarPage,
})

const EVENT_TYPES = [
  { value: 'event', label: 'Event', color: 'bg-blue-500' },
  { value: 'holiday', label: 'Holiday', color: 'bg-green-500' },
  { value: 'exam', label: 'Exam', color: 'bg-orange-500' },
  { value: 'meeting', label: 'Meeting', color: 'bg-purple-500' },
  { value: 'deadline', label: 'Deadline', color: 'bg-red-500' },
] as const

const typeColor = (type: string) =>
  EVENT_TYPES.find((t) => t.value === type)?.color ?? 'bg-muted-foreground'

const typeBadgeVariant = (type: string) => {
  switch (type) {
    case 'holiday':
      return 'success' as const
    case 'exam':
      return 'warning' as const
    case 'deadline':
      return 'destructive' as const
    case 'meeting':
      return 'outline' as const
    default:
      return 'default' as const
  }
}

interface CalendarEvent {
  id: number
  title: string
  description: string | null
  startDate: string
  endDate: string | null
  type: string
  color: string | null
}

const selectClass =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'

function CalendarPage() {
  const { session } = Route.useRouteContext()
  const userRole = (session.user as { role?: string }).role ?? 'student'
  const canEdit = userRole === 'admin' || userRole === 'staff'

  const queryClient = useQueryClient()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editEvent, setEditEvent] = useState<CalendarEvent | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CalendarEvent | null>(null)

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const rangeStart = format(startOfWeek(monthStart), 'yyyy-MM-dd')
  const rangeEnd = format(endOfWeek(monthEnd), 'yyyy-MM-dd')

  const { data: events = [] } = useQuery({
    queryKey: ['calendarEvents', rangeStart, rangeEnd],
    queryFn: () =>
      listCalendarEvents({
        data: { startDate: rangeStart, endDate: rangeEnd },
      }) as Promise<CalendarEvent[]>,
  })

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['calendarEvents'] })

  const createMutation = useMutation({
    mutationFn: (data: {
      title: string
      description?: string
      startDate: string
      endDate?: string
      type: string
    }) => createCalendarEvent({ data }),
    onSuccess: () => {
      invalidate()
      setDialogOpen(false)
      toast.success('Event created')
    },
    onError: () => toast.error('Failed to create event'),
  })

  const updateMutation = useMutation({
    mutationFn: (data: {
      id: number
      title?: string
      description?: string
      startDate?: string
      endDate?: string | null
      type?: string
    }) => updateCalendarEvent({ data }),
    onSuccess: () => {
      invalidate()
      setDialogOpen(false)
      setEditEvent(null)
      toast.success('Event updated')
    },
    onError: () => toast.error('Failed to update event'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteCalendarEvent({ data: { id } }),
    onSuccess: () => {
      invalidate()
      setDeleteTarget(null)
      toast.success('Event deleted')
    },
    onError: () => toast.error('Failed to delete event'),
  })

  // Build calendar grid
  const calendarStart = startOfWeek(monthStart)
  const calendarEnd = endOfWeek(monthEnd)
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  const eventsForDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
    for (const day of days) {
      const dayStr = format(day, 'yyyy-MM-dd')
      const dayEvents = events.filter((ev) => {
        const start = parseISO(ev.startDate)
        const end = ev.endDate ? parseISO(ev.endDate) : start
        return isWithinInterval(day, { start, end }) || isSameDay(day, start)
      })
      if (dayEvents.length > 0) map.set(dayStr, dayEvents)
    }
    return map
  }, [days, events])

  const selectedDateStr = selectedDate
    ? format(selectedDate, 'yyyy-MM-dd')
    : null
  const selectedDayEvents = selectedDateStr
    ? eventsForDay.get(selectedDateStr) ?? []
    : []

  const handleDayClick = (day: Date) => {
    setSelectedDate(day)
  }

  const handleNewEvent = () => {
    setEditEvent(null)
    setDialogOpen(true)
  }

  const handleEditEvent = (ev: CalendarEvent) => {
    setEditEvent(ev)
    setDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Academic Calendar</h1>
        {canEdit && <Button onClick={handleNewEvent}>Add Event</Button>}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Calendar Grid */}
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            >
              Prev
            </Button>
            <CardTitle className="text-lg">
              {format(currentMonth, 'MMMM yyyy')}
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            >
              Next
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-px">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <div
                  key={d}
                  className="p-2 text-center text-xs font-medium text-muted-foreground"
                >
                  {d}
                </div>
              ))}
              {days.map((day) => {
                const dayStr = format(day, 'yyyy-MM-dd')
                const dayEvents = eventsForDay.get(dayStr)
                const isToday = isSameDay(day, new Date())
                const isSelected = selectedDate && isSameDay(day, selectedDate)
                const inMonth = isSameMonth(day, currentMonth)
                return (
                  <button
                    type="button"
                    key={dayStr}
                    onClick={() => handleDayClick(day)}
                    className={`relative min-h-16 rounded-md border p-1 text-left transition-colors ${
                      !inMonth ? 'text-muted-foreground/40' : ''
                    } ${isToday ? 'border-primary' : 'border-transparent'} ${
                      isSelected
                        ? 'bg-accent ring-1 ring-primary'
                        : 'hover:bg-accent/50'
                    }`}
                  >
                    <span
                      className={`text-xs font-medium ${isToday ? 'text-primary' : ''}`}
                    >
                      {format(day, 'd')}
                    </span>
                    {dayEvents && (
                      <div className="mt-0.5 flex flex-col gap-0.5">
                        {dayEvents.slice(0, 2).map((ev) => (
                          <div
                            key={ev.id}
                            className={`truncate rounded px-1 text-[10px] leading-tight text-white ${typeColor(ev.type)}`}
                          >
                            {ev.title}
                          </div>
                        ))}
                        {dayEvents.length > 2 && (
                          <span className="text-[10px] text-muted-foreground">
                            +{dayEvents.length - 2} more
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Sidebar: selected day or upcoming */}
        <div className="space-y-4">
          {selectedDate ? (
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">
                  {format(selectedDate, 'EEEE, MMM d')}
                </CardTitle>
                {canEdit && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNewEvent}
                  >
                    +
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {selectedDayEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No events on this day
                  </p>
                ) : (
                  <div className="space-y-3">
                    {selectedDayEvents.map((ev) => (
                      <div
                        key={ev.id}
                        className="space-y-1 rounded-md border p-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium">{ev.title}</p>
                            <Badge
                              variant={typeBadgeVariant(ev.type)}
                              className="mt-0.5 text-[10px]"
                            >
                              {ev.type}
                            </Badge>
                          </div>
                          {canEdit && (
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="xs"
                                onClick={() => handleEditEvent(ev)}
                              >
                                Edit
                              </Button>
                              <Button
                                variant="ghost"
                                size="xs"
                                className="text-destructive"
                                onClick={() => setDeleteTarget(ev)}
                              >
                                Del
                              </Button>
                            </div>
                          )}
                        </div>
                        {ev.description && (
                          <p className="text-xs text-muted-foreground">
                            {ev.description}
                          </p>
                        )}
                        {ev.endDate && ev.endDate !== ev.startDate && (
                          <p className="text-xs text-muted-foreground">
                            Until {format(parseISO(ev.endDate), 'MMM d')}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Upcoming Events</CardTitle>
              </CardHeader>
              <CardContent>
                {events.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No events this month
                  </p>
                ) : (
                  <div className="space-y-3">
                    {events
                      .sort((a, b) => a.startDate.localeCompare(b.startDate))
                      .slice(0, 8)
                      .map((ev) => (
                        <div key={ev.id} className="flex items-start gap-2">
                          <div
                            className={`mt-1 size-2 shrink-0 rounded-full ${typeColor(ev.type)}`}
                          />
                          <div>
                            <p className="text-sm font-medium">{ev.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(parseISO(ev.startDate), 'MMM d')}
                              {ev.endDate &&
                                ev.endDate !== ev.startDate &&
                                ` – ${format(parseISO(ev.endDate), 'MMM d')}`}
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Legend */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex flex-wrap gap-3">
                {EVENT_TYPES.map((t) => (
                  <div key={t.value} className="flex items-center gap-1.5">
                    <div className={`size-2.5 rounded-full ${t.color}`} />
                    <span className="text-xs text-muted-foreground">
                      {t.label}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Create/Edit Dialog */}
      <EventFormDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) setEditEvent(null)
        }}
        event={editEvent}
        defaultDate={selectedDate ? format(selectedDate, 'yyyy-MM-dd') : undefined}
        onSubmit={(data) => {
          if (editEvent) {
            updateMutation.mutate({ id: editEvent.id, ...data })
          } else {
            createMutation.mutate(data)
          }
        }}
        loading={createMutation.isPending || updateMutation.isPending}
      />

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Event</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{' '}
              <span className="font-medium text-foreground">
                {deleteTarget?.title}
              </span>
              ? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ── Event Form Dialog ───────────────────────────────────────

function EventFormDialog({
  open,
  onOpenChange,
  event,
  defaultDate,
  onSubmit,
  loading,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  event: CalendarEvent | null
  defaultDate?: string
  onSubmit: (data: {
    title: string
    description?: string
    startDate: string
    endDate?: string
    type: string
  }) => void
  loading: boolean
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [type, setType] = useState('event')

  // Reset form when dialog opens
  const handleOpenChange = (open: boolean) => {
    if (open) {
      if (event) {
        setTitle(event.title)
        setDescription(event.description ?? '')
        setStartDate(event.startDate)
        setEndDate(event.endDate ?? '')
        setType(event.type)
      } else {
        setTitle('')
        setDescription('')
        setStartDate(defaultDate ?? '')
        setEndDate('')
        setType('event')
      }
    }
    onOpenChange(open)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      title,
      description: description || undefined,
      startDate,
      endDate: endDate || undefined,
      type,
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{event ? 'Edit Event' : 'New Event'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Event title"
            />
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className={selectClass}
            >
              {EVENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>End Date (optional)</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Description (optional)</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Event details"
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Saving...' : event ? 'Update Event' : 'Create Event'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
