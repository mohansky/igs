import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Dialog, DialogContent, DialogTitle } from '#/components/ui/dialog'
import { listStudents } from '#/server/students'
import { listCalendarEvents } from '#/server/calendar'
import {
  Calendar03Icon,
  CalendarCheckIn01Icon,
  Invoice02Icon,
  StudentIcon,
  UserMultipleIcon,
  UserGroupIcon,
  Book02Icon,
  UserIcon,
  Home09Icon,
  FileAttachmentIcon,
  MoneyReceiveSquareIcon,
  TimeScheduleIcon,
  MoneySendSquareIcon,
} from 'hugeicons-react'
import { cn } from '#/lib/utils'

type Role = 'admin' | 'staff' | 'student'

interface NavLink {
  kind: 'nav'
  label: string
  to: string
  roles: Role[]
  icon: React.ComponentType<{ className?: string }>
}

const NAV_LINKS: NavLink[] = [
  {
    kind: 'nav',
    label: 'Overview',
    to: '/dashboard',
    roles: ['admin', 'staff', 'student'],
    icon: Home09Icon,
  },
  {
    kind: 'nav',
    label: 'Attendance',
    to: '/dashboard/attendance',
    roles: ['admin', 'staff', 'student'],
    icon: Calendar03Icon,
  },
  {
    kind: 'nav',
    label: 'Fees',
    to: '/dashboard/fees',
    roles: ['admin', 'staff', 'student'],
    icon: Invoice02Icon,
  },
  {
    kind: 'nav',
    label: 'Calendar',
    to: '/dashboard/calendar',
    roles: ['admin', 'staff', 'student'],
    icon: CalendarCheckIn01Icon,
  },
  {
    kind: 'nav',
    label: 'Profile',
    to: '/dashboard/profile',
    roles: ['admin', 'staff', 'student'],
    icon: UserIcon,
  },
  {
    kind: 'nav',
    label: 'Students',
    to: '/dashboard/students',
    roles: ['admin', 'staff'],
    icon: StudentIcon,
  },
  {
    kind: 'nav',
    label: 'Submissions',
    to: '/dashboard/submissions',
    roles: ['admin', 'staff'],
    icon: FileAttachmentIcon,
  },
  {
    kind: 'nav',
    label: 'Staff',
    to: '/dashboard/staff',
    roles: ['admin'],
    icon: UserGroupIcon,
  },
  {
    kind: 'nav',
    label: 'Add Staff',
    to: '/dashboard/staff/new',
    roles: ['admin'],
    icon: UserGroupIcon,
  },
  {
    kind: 'nav',
    label: 'Staff Attendance',
    to: '/dashboard/staff-attendance',
    roles: ['admin'],
    icon: TimeScheduleIcon,
  },
  {
    kind: 'nav',
    label: 'Staff Salaries',
    to: '/dashboard/salaries',
    roles: ['admin'],
    icon: MoneySendSquareIcon,
  },
  {
    kind: 'nav',
    label: 'Users',
    to: '/dashboard/users',
    roles: ['admin'],
    icon: UserMultipleIcon,
  },
  {
    kind: 'nav',
    label: 'Classes',
    to: '/dashboard/classes',
    roles: ['admin'],
    icon: Book02Icon,
  },
  {
    kind: 'nav',
    label: 'Expenses',
    to: '/dashboard/expenses',
    roles: ['admin'],
    icon: MoneyReceiveSquareIcon,
  },
]

interface CommandPaletteProps {
  userRole: Role
}

type ResultItem =
  | {
      kind: 'nav'
      id: string
      label: string
      sublabel?: string
      to: string
      icon: React.ComponentType<{ className?: string }>
    }
  | {
      kind: 'student'
      id: string
      label: string
      sublabel?: string
      to: string
    }
  | { kind: 'event'; id: string; label: string; sublabel?: string; to: string }

export function CommandPalette({ userRole }: CommandPaletteProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const isStaffOrAdmin = userRole === 'admin' || userRole === 'staff'

  const { data: students = [] } = useQuery({
    queryKey: ['students'],
    queryFn: () => listStudents(),
    enabled: open && isStaffOrAdmin,
  })

  const { data: events = [] } = useQuery({
    queryKey: ['calendar-events-all'],
    queryFn: () => listCalendarEvents({ data: {} }),
    enabled: open,
  })

  const results = useMemo<ResultItem[]>(() => {
    const q = query.trim().toLowerCase()
    const items: ResultItem[] = []

    const navItems = NAV_LINKS.filter((l) => l.roles.includes(userRole))
    for (const link of navItems) {
      if (!q || link.label.toLowerCase().includes(q)) {
        items.push({
          kind: 'nav',
          id: `nav-${link.to}`,
          label: link.label,
          to: link.to,
          icon: link.icon,
        })
      }
    }

    if (q && isStaffOrAdmin) {
      for (const s of students) {
        const name = s.studentName?.toLowerCase() ?? ''
        const adm = (s.admissionNumber ?? '').toLowerCase()
        if (name.includes(q) || adm.includes(q)) {
          items.push({
            kind: 'student',
            id: `student-${s.id}`,
            label: s.studentName,
            sublabel: s.admissionNumber ? `#${s.admissionNumber}` : undefined,
            to: `/dashboard/students/${s.id}`,
          })
          if (items.length > 40) break
        }
      }
    }

    if (q) {
      for (const e of events) {
        if (e.title?.toLowerCase().includes(q)) {
          items.push({
            kind: 'event',
            id: `event-${e.id}`,
            label: e.title,
            sublabel: `${e.type} · ${e.startDate}`,
            to: '/dashboard/calendar',
          })
          if (items.length > 60) break
        }
      }
    }

    return items
  }, [query, students, events, userRole, isStaffOrAdmin])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    if (open) {
      setQuery('')
      setActiveIndex(0)
      setTimeout(() => inputRef.current?.focus(), 10)
    }
  }, [open])

  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  const go = (to: string) => {
    setOpen(false)
    navigate({ to })
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const item = results[activeIndex]
      if (item) go(item.to)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="top-[15%] max-w-xl translate-y-0 gap-0 overflow-hidden p-0"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">Command palette</DialogTitle>
        <div className="border-b p-3">
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search pages, students, events…"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div className="max-h-80 overflow-y-auto p-1">
          {results.length === 0 && (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">
              No results
            </div>
          )}
          {results.map((r, i) => (
            <button
              key={r.id}
              type="button"
              onMouseEnter={() => setActiveIndex(i)}
              onClick={() => go(r.to)}
              className={cn(
                'flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm',
                activeIndex === i && 'bg-accent',
              )}
            >
              <ResultIcon item={r} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{r.label}</p>
                {r.sublabel && (
                  <p className="truncate text-xs text-muted-foreground">
                    {r.sublabel}
                  </p>
                )}
              </div>
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                {r.kind}
              </span>
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between border-t px-3 py-2 text-[11px] text-muted-foreground">
          <span>↑↓ navigate · ↵ select · esc close</span>
          <span>Cmd/Ctrl + K</span>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ResultIcon({ item }: { item: ResultItem }) {
  if (item.kind === 'nav') {
    const Icon = item.icon
    return <Icon className="size-4 text-muted-foreground" />
  }
  if (item.kind === 'student') {
    return <StudentIcon className="size-4 text-muted-foreground" />
  }
  return <CalendarCheckIn01Icon className="size-4 text-muted-foreground" />
}
