import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Label } from '#/components/ui/label'
import { downloadCsv } from '#/lib/csv'
import { listAttendance } from '#/server/attendance'
import { listClasses } from '#/server/classes'
import { CustomDataTable } from './custom-data-table'

interface AttendanceRecord {
  id: number
  date: string
  status: string
  notes: string | null
  studentUserId: string
  studentName: string | null
  admissionNumber: string | null
  classId: number | null
}

const statusBadgeVariant = (status: string) => {
  switch (status) {
    case 'present':
      return 'default' as const
    case 'absent':
      return 'destructive' as const
    case 'late':
      return 'secondary' as const
    default:
      return 'outline' as const
  }
}

const columns: ColumnDef<AttendanceRecord>[] = [
  {
    accessorKey: 'date',
    header: 'Date',
  },
  {
    accessorKey: 'studentName',
    header: 'Student',
    cell: ({ row }) => {
      const name = row.getValue('studentName') as string | null
      const admNo = row.original.admissionNumber
      return (
        <div>
          <span className="font-medium">{name ?? '-'}</span>
          {admNo && (
            <span className="ml-2 text-xs text-muted-foreground">
              ({admNo})
            </span>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.getValue('status') as string
      return (
        <Badge className="capitalize" variant={statusBadgeVariant(status)}>
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
    accessorKey: 'notes',
    header: 'Notes',
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {(row.getValue('notes') as string | null) ?? '-'}
      </span>
    ),
  },
]

export function AttendanceLog() {
  const [classFilter, setClassFilter] = useState<number | 0>(0)

  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: () =>
      listClasses().then((data) =>
        data.map((c) => ({ id: c.id, name: c.name, section: c.section })),
      ),
  })

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['attendance', 'all', classFilter],
    queryFn: () =>
      listAttendance({
        data: classFilter ? { classId: classFilter } : {},
      }) as Promise<AttendanceRecord[]>,
  })

  const summary = {
    total: records.length,
    present: records.filter((r) => r.status === 'present').length,
    absent: records.filter((r) => r.status === 'absent').length,
    late: records.filter((r) => r.status === 'late').length,
  }

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading...</p>
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-2">
          <Label>Class</Label>
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(Number(e.target.value))}
            className="flex h-9 w-full min-w-40 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value={0}>All classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.section ? ` - ${c.section}` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            downloadCsv(
              records,
              [
                { key: 'date', label: 'Date' },
                { key: 'studentName', label: 'Student' },
                { key: 'admissionNumber', label: 'Admission #' },
                { key: 'status', label: 'Status' },
                { key: 'notes', label: 'Notes' },
              ],
              'attendance-export',
            )
          }
          disabled={records.length === 0}
        >
          Export CSV
        </Button>
        <Badge variant="outline">Total: {summary.total}</Badge>
        <Badge variant="default">Present: {summary.present}</Badge>
        <Badge variant="destructive">Absent: {summary.absent}</Badge>
        <Badge variant="secondary">Late: {summary.late}</Badge>
        {summary.total > 0 && (
          <Badge variant="outline">
            Rate: {Math.round((summary.present / summary.total) * 100)}%
          </Badge>
        )}
      </div>

      <CustomDataTable
        columns={columns}
        data={records}
        showDatePicker
        dateField="date"
        filters={[
          { column: 'studentName', placeholder: 'Search student...' },
          {
            column: 'status',
            placeholder: 'Filter by status',
            type: 'select',
            options: [
              { label: 'All', value: 'all' },
              { label: 'Present', value: 'present' },
              { label: 'Absent', value: 'absent' },
              { label: 'Late', value: 'late' },
            ],
          },
        ]}
      />
    </div>
  )
}
