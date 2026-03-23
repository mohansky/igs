import { createFileRoute, redirect } from '@tanstack/react-router'
import { useState, useMemo } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { ColumnDef } from '@tanstack/react-table'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Badge } from '#/components/ui/badge'
import { formatDate } from '#/lib/utils'
import { Card, CardContent } from '#/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '#/components/ui/tabs'
import { CustomDataTable } from '#/components/dashboard/custom-data-table'
import {
  getStaffAttendanceByDate,
  markStaffAttendance,
  listStaffAttendance,
} from '#/server/staff-attendance'

export const Route = createFileRoute('/dashboard/staff-attendance')({
  beforeLoad: ({ context }) => {
    const userRole =
      (context.session.user as { role?: string }).role ?? 'student'
    if (userRole !== 'admin') {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: StaffAttendancePage,
})

// ── Mark tab ──────────────────────────────────────────────────

interface StaffRecord {
  userId: string
  name: string
  status: string
  checkIn: string
  checkOut: string
  notes: string
}

function StaffAttendanceMarker() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [staff, setStaff] = useState<StaffRecord[]>([])
  const [loaded, setLoaded] = useState(false)
  const [loading, setLoading] = useState(false)

  const loadAttendance = async () => {
    setLoading(true)
    try {
      const result = (await getStaffAttendanceByDate({
        data: { date },
      })) as {
        staff: { id: string; name: string }[]
        records: {
          userId: string
          status: string
          checkIn: string | null
          checkOut: string | null
          notes: string | null
        }[]
      }

      const records = result.staff.map((s) => {
        const existing = result.records.find((r) => r.userId === s.id)
        return {
          userId: s.id,
          name: s.name,
          status: existing?.status ?? 'present',
          checkIn: existing?.checkIn ?? '',
          checkOut: existing?.checkOut ?? '',
          notes: existing?.notes ?? '',
        }
      })
      setStaff(records)
      setLoaded(true)
    } catch {
      setStaff([])
      setLoaded(false)
    } finally {
      setLoading(false)
    }
  }

  const summary = useMemo(
    () => ({
      total: staff.length,
      present: staff.filter((s) => s.status === 'present').length,
      absent: staff.filter((s) => s.status === 'absent').length,
      late: staff.filter((s) => s.status === 'late').length,
      leave: staff.filter((s) => s.status === 'leave').length,
    }),
    [staff],
  )

  const setStatus = (userId: string, status: string) => {
    setStaff((prev) =>
      prev.map((s) => (s.userId === userId ? { ...s, status } : s)),
    )
  }

  const setField = (
    userId: string,
    field: 'checkIn' | 'checkOut' | 'notes',
    value: string,
  ) => {
    setStaff((prev) =>
      prev.map((s) => (s.userId === userId ? { ...s, [field]: value } : s)),
    )
  }

  const saveMutation = useMutation({
    mutationFn: () =>
      markStaffAttendance({
        data: {
          date,
          records: staff.map((s) => ({
            userId: s.userId,
            status: s.status,
            checkIn: s.checkIn || undefined,
            checkOut: s.checkOut || undefined,
            notes: s.notes || undefined,
          })),
        },
      }),
    onSuccess: () => toast.success('Staff attendance saved'),
    onError: () => toast.error('Failed to save staff attendance'),
  })

  const statusVariant = (status: string) => {
    switch (status) {
      case 'present':
        return 'default' as const
      case 'absent':
        return 'destructive' as const
      case 'late':
        return 'secondary' as const
      case 'leave':
        return 'outline' as const
      default:
        return 'outline' as const
    }
  }

  return (
    <div className="space-y-4">
      <Card className="max-w-fit border-0 bg-transparent shadow-none">
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => {
                  setDate(e.target.value)
                  setLoaded(false)
                }}
                className="w-40"
              />
            </div>
            <Button onClick={loadAttendance} disabled={loading}>
              {loading ? 'Loading...' : 'Load Staff'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {loaded && staff.length > 0 && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground">
              {date}
            </span>
            <Badge variant="outline">{summary.total} staff</Badge>
            <Badge variant="default">{summary.present} present</Badge>
            <Badge variant="destructive">{summary.absent} absent</Badge>
            <Badge variant="secondary">{summary.late} late</Badge>
            <Badge variant="outline">{summary.leave} leave</Badge>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-52">Actions</TableHead>
                <TableHead className="w-28">Check In</TableHead>
                <TableHead className="w-28">Check Out</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staff.map((s, i) => (
                <TableRow key={s.userId}>
                  <TableCell className="text-muted-foreground">
                    {i + 1}
                  </TableCell>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(s.status)}>{s.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant={
                          s.status === 'present' ? 'default' : 'outline'
                        }
                        size="sm"
                        onClick={() => setStatus(s.userId, 'present')}
                      >
                        P
                      </Button>
                      <Button
                        variant={
                          s.status === 'absent' ? 'destructive' : 'outline'
                        }
                        size="sm"
                        onClick={() => setStatus(s.userId, 'absent')}
                      >
                        A
                      </Button>
                      <Button
                        variant={s.status === 'late' ? 'secondary' : 'outline'}
                        size="sm"
                        onClick={() => setStatus(s.userId, 'late')}
                      >
                        L
                      </Button>
                      <Button
                        variant={s.status === 'leave' ? 'outline' : 'ghost'}
                        size="sm"
                        onClick={() => setStatus(s.userId, 'leave')}
                      >
                        Lv
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="time"
                      value={s.checkIn}
                      onChange={(e) =>
                        setField(s.userId, 'checkIn', e.target.value)
                      }
                      className="h-8 w-full"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="time"
                      value={s.checkOut}
                      onChange={(e) =>
                        setField(s.userId, 'checkOut', e.target.value)
                      }
                      className="h-8 w-full"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={s.notes}
                      onChange={(e) =>
                        setField(s.userId, 'notes', e.target.value)
                      }
                      placeholder="Optional"
                      className="h-8"
                    />
                  </TableCell>
                </TableRow>
              ))}
              {staff.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center text-muted-foreground"
                  >
                    No staff members found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <div className="flex items-center gap-4">
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? 'Saving...' : 'Save Attendance'}
            </Button>
            <span className="text-sm text-muted-foreground">
              Saves attendance for all {summary.total} staff members
            </span>
          </div>
        </>
      )}

      {loaded && staff.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No staff members found. Add users with the &quot;staff&quot; role
          first.
        </p>
      )}
    </div>
  )
}

// ── History tab ───────────────────────────────────────────────

interface StaffAttendanceRecord {
  id: number
  date: string
  status: string
  checkIn: string | null
  checkOut: string | null
  notes: string | null
  userId: string
  staffName: string | null
  staffEmail: string | null
}

const logStatusVariant = (status: string) => {
  switch (status) {
    case 'present':
      return 'default' as const
    case 'absent':
      return 'destructive' as const
    case 'late':
      return 'secondary' as const
    case 'leave':
      return 'outline' as const
    default:
      return 'outline' as const
  }
}

const historyColumns: ColumnDef<StaffAttendanceRecord>[] = [
  {
    accessorKey: 'date',
    header: 'Date',
    cell: ({ row }) => formatDate(row.getValue('date')),
  },
  {
    accessorKey: 'staffName',
    header: 'Staff',
    cell: ({ row }) => (
      <span className="font-medium">
        {(row.getValue('staffName') as string | null) ?? '-'}
      </span>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.getValue('status') as string
      return (
        <Badge className="capitalize" variant={logStatusVariant(status)}>
          {status}
        </Badge>
      )
    },
    filterFn: (row, _id, value) => {
      if (!value || value === 'all') return true
      return row.getValue('status') === value
    },
  },
  {
    accessorKey: 'checkIn',
    header: 'Check In',
    cell: ({ row }) => row.getValue('checkIn') ?? '-',
  },
  {
    accessorKey: 'checkOut',
    header: 'Check Out',
    cell: ({ row }) => row.getValue('checkOut') ?? '-',
  },
  {
    accessorKey: 'notes',
    header: 'Notes',
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {(row.getValue('notes') as string | null) ?? '-'}
      </span>
    ),
  },
]

function StaffAttendanceHistory() {
  const { data: records = [], isLoading } = useQuery({
    queryKey: ['staff-attendance', 'all'],
    queryFn: () =>
      listStaffAttendance({ data: {} }) as Promise<
        StaffAttendanceRecord[]
      >,
  })

  const summary = {
    total: records.length,
    present: records.filter((r) => r.status === 'present').length,
    absent: records.filter((r) => r.status === 'absent').length,
    late: records.filter((r) => r.status === 'late').length,
    leave: records.filter((r) => r.status === 'leave').length,
  }

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading...</p>
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Badge variant="outline">Total: {summary.total}</Badge>
        <Badge variant="default">Present: {summary.present}</Badge>
        <Badge variant="destructive">Absent: {summary.absent}</Badge>
        <Badge variant="secondary">Late: {summary.late}</Badge>
        <Badge variant="outline">Leave: {summary.leave}</Badge>
      </div>

      <CustomDataTable
        columns={historyColumns}
        data={records}
        showDatePicker
        dateField="date"
        filters={[
          { column: 'staffName', placeholder: 'Search staff...' },
          {
            column: 'status',
            placeholder: 'Filter by status',
            type: 'select',
            options: [
              { label: 'All', value: 'all' },
              { label: 'Present', value: 'present' },
              { label: 'Absent', value: 'absent' },
              { label: 'Late', value: 'late' },
              { label: 'Leave', value: 'leave' },
            ],
          },
        ]}
      />
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────

function StaffAttendancePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Staff Attendance</h1>
      <Tabs defaultValue="mark">
        <TabsList>
          <TabsTrigger value="mark">Mark Attendance</TabsTrigger>
          <TabsTrigger value="history">View History</TabsTrigger>
        </TabsList>
        <TabsContent value="mark">
          <StaffAttendanceMarker />
        </TabsContent>
        <TabsContent value="history">
          <StaffAttendanceHistory />
        </TabsContent>
      </Tabs>
    </div>
  )
}
