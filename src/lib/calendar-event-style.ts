import type { CalendarEventType } from '#/server/calendar'

// Single source of truth for how calendar event types are coloured, shared by
// the calendar page and the dashboard's Upcoming Events card.

export const EVENT_TYPES: {
  value: CalendarEventType
  label: string
  color: string
}[] = [
  { value: 'event', label: 'Event', color: 'bg-blue-500' },
  { value: 'holiday', label: 'Holiday', color: 'bg-green-500' },
  { value: 'exam', label: 'Exam', color: 'bg-orange-500' },
  { value: 'meeting', label: 'Meeting', color: 'bg-purple-500' },
  { value: 'deadline', label: 'Deadline', color: 'bg-red-500' },
] as const

// Solid dot / chip colour (mini-calendar, legends).
export const typeColor = (type: string) =>
  EVENT_TYPES.find((t) => t.value === type)?.color ?? 'bg-muted-foreground'

// shadcn Badge variant used for event-type badges in lists.
export const typeBadgeVariant = (type: string) => {
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
