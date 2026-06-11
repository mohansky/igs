import { createFileRoute, redirect } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { Badge } from '#/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Skeleton } from '#/components/ui/skeleton'
import { CustomDataTable } from '#/components/dashboard/CustomDataTable'
import { getStaffAttendanceHistory } from '#/server/staff'
import { formatDate } from '#/lib/utils'

export const Route = createFileRoute('/dashboard/my-attendance')({
  beforeLoad: ({ context }) => {
    const userRole =
      (context.session.user as { role?: string }).role ?? 'student'
    if (userRole !== 'staff' && userRole !== 'admin') {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: MyAttendancePage,
})

interface AttendanceRow {
  id: number
  userId: string
  date: string
  status: string
  checkIn: string | null
  checkOut: string | null
  notes: string | null
}

const statusVariant = (status: string) => {
  switch (status) {
    case 'present':
      return 'default' as const
    case 'absent':
      return 'destructive' as const
    case 'late':
      return 'warning' as const
    case 'leave':
      return 'success' as const
    default:
      return 'outline' as const
  }
}

function MyAttendancePage() {
  const { session } = Route.useRouteContext()
  const userId = session.user.id

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['my-attendance', userId],
    queryFn: () =>
      getStaffAttendanceHistory({ data: { userId } }) as Promise<
        AttendanceRow[]
      >,
  })

  const summary = {
    total: rows.length,
    present: rows.filter((r) => r.status === 'present').length,
    absent: rows.filter((r) => r.status === 'absent').length,
    late: rows.filter((r) => r.status === 'late').length,
    leave: rows.filter((r) => r.status === 'leave').length,
  }
  const rate =
    summary.total > 0 ? Math.round((summary.present / summary.total) * 100) : 0

  const columns: ColumnDef<AttendanceRow>[] = [
    {
      accessorKey: 'date',
      header: 'Date',
      cell: ({ row }) => formatDate(row.getValue('date')),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.getValue('status') as string
        return (
          <Badge className="capitalize" variant={statusVariant(status)}>
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

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">My Attendance</h1>
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">My Attendance</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Days
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{summary.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Present
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              {summary.present}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Absent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">{summary.absent}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Late / Leave
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-600">
              {summary.late} / {summary.leave}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Attendance Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{rate}%</p>
          </CardContent>
        </Card>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No attendance records yet.
        </p>
      ) : (
        <CustomDataTable
          tableId="my-attendance"
          columns={columns}
          data={rows}
          showDatePicker
          dateField="date"
          filters={[
            {
              column: 'status',
              placeholder: 'Filter by status',
              label: 'Status',
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
      )}
    </div>
  )
}
