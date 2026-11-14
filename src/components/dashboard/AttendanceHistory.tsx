import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { useQuery } from '@tanstack/react-query'
import { Badge } from '#/components/ui/badge'
import { formatDate } from '#/lib/utils'
import { getStudentAttendance } from '#/server/attendance'
import { CustomDataTable } from './CustomDataTable'
import {
  MONTH_COLUMN_ID,
  monthColumn,
  monthFilterOptions,
} from './data-table/month-filter'

interface AttendanceRecord {
  id: number
  date: string
  status: string
  notes: string | null
}

const statusBadgeVariant = (status: string) => {
  switch (status) {
    case 'present':
      return 'default' as const
    case 'absent':
      return 'destructive' as const
    case 'late':
      return 'warning' as const
    default:
      return 'outline' as const
  }
}

const columns: ColumnDef<AttendanceRecord>[] = [
  // Hidden; only there for the Month filter.
  monthColumn<AttendanceRecord>(),
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
      return <Badge variant={statusBadgeVariant(status)}>{status}</Badge>
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

export function AttendanceHistory({
  studentProfileId,
}: {
  studentProfileId?: number
} = {}) {
  const { data: records = [], isLoading } = useQuery({
    queryKey: ['attendance', 'mine', studentProfileId],
    queryFn: () =>
      getStudentAttendance({
        data: { studentProfileId },
      }) as Promise<AttendanceRecord[]>,
  })

  const monthOptions = useMemo(
    () => monthFilterOptions(records.map((r) => r.date)),
    [records],
  )

  // The badges count the rows the filters leave visible.
  const [visibleRows, setVisibleRows] = useState<AttendanceRecord[] | null>(
    null,
  )
  const summaryRows = visibleRows ?? records
  const summary = {
    total: summaryRows.length,
    present: summaryRows.filter((r) => r.status === 'present').length,
    absent: summaryRows.filter((r) => r.status === 'absent').length,
    late: summaryRows.filter((r) => r.status === 'late').length,
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
        <Badge variant="warning">Late: {summary.late}</Badge>
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
        hiddenColumns={[MONTH_COLUMN_ID]}
        onFilteredRowsChange={setVisibleRows}
        filters={[
          {
            column: MONTH_COLUMN_ID,
            placeholder: 'Filter by month',
            label: 'Month',
            type: 'select',
            options: monthOptions,
          },
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
