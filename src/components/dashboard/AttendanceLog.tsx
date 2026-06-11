import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { downloadCsv } from '#/lib/csv'
import { formatDate } from '#/lib/utils'
import { listAttendance } from '#/server/attendance'
import { listClasses } from '#/server/classes'
import { CustomDataTable } from './CustomDataTable'

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
      return 'warning' as const
    default:
      return 'outline' as const
  }
}

export function AttendanceLog() {
  const [filteredRows, setFilteredRows] = useState<AttendanceRecord[]>([])

  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: () =>
      listClasses().then((data) =>
        data.map((c) => ({ id: c.id, name: c.name, section: c.section })),
      ),
  })

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['attendance', 'all'],
    queryFn: () => listAttendance({ data: {} }) as Promise<AttendanceRecord[]>,
  })

  const classLabelById = useMemo(() => {
    const map = new Map<number, string>()
    for (const c of classes) {
      map.set(c.id, c.section ? `${c.name} - ${c.section}` : c.name)
    }
    return map
  }, [classes])

  const columns: ColumnDef<AttendanceRecord>[] = useMemo(
    () => [
      {
        accessorKey: 'date',
        header: 'Date',
        cell: ({ row }) => formatDate(row.getValue('date')),
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
        filterFn: (row, _id, value) => {
          if (!value || value === 'all') return true
          return row.getValue('studentName') === value
        },
      },
      {
        accessorKey: 'classId',
        header: 'Class',
        cell: ({ row }) => {
          const id = row.getValue('classId') as number | null
          return id != null ? (classLabelById.get(id) ?? '-') : '-'
        },
        filterFn: (row, _id, value) => {
          if (!value || value === 'all') return true
          return String(row.getValue('classId')) === String(value)
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
    ],
    [classLabelById],
  )

  const studentOptions = useMemo(() => {
    const names = new Set<string>()
    for (const r of records) if (r.studentName) names.add(r.studentName)
    return [
      { label: 'All students', value: 'all' },
      ...Array.from(names)
        .sort((a, b) => a.localeCompare(b))
        .map((name) => ({ label: name, value: name })),
    ]
  }, [records])

  const classOptions = useMemo(() => {
    const ids = new Set<number>()
    for (const r of records) if (r.classId != null) ids.add(r.classId)
    return [
      { label: 'All classes', value: 'all' },
      ...Array.from(ids)
        .sort((a, b) =>
          (classLabelById.get(a) ?? '').localeCompare(
            classLabelById.get(b) ?? '',
          ),
        )
        .map((id) => ({
          label: classLabelById.get(id) ?? `Class #${id}`,
          value: String(id),
        })),
    ]
  }, [records, classLabelById])

  const summary = useMemo(() => {
    const source = filteredRows
    return {
      total: source.length,
      present: source.filter((r) => r.status === 'present').length,
      absent: source.filter((r) => r.status === 'absent').length,
      late: source.filter((r) => r.status === 'late').length,
    }
  }, [filteredRows])

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading...</p>
  }

  const exportButton = (
    <Button
      variant="outline"
      size="sm"
      onClick={() =>
        downloadCsv(
          filteredRows,
          [
            { key: 'date', label: 'Date' },
            { key: 'studentName', label: 'Student' },
            { key: 'admissionNumber', label: 'Admission #' },
            { key: 'classId', label: 'Class ID' },
            { key: 'status', label: 'Status' },
            { key: 'notes', label: 'Notes' },
          ],
          'attendance-export',
        )
      }
      disabled={filteredRows.length === 0}
    >
      Export CSV
    </Button>
  )

  const summaryBar = (
    <div className="mb-2 flex flex-wrap items-center gap-2">
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
  )

  return (
    <div className="space-y-4">
      <CustomDataTable
        columns={columns}
        data={records}
        showDatePicker
        dateField="date"
        onFilteredRowsChange={setFilteredRows}
        filtersExtras={exportButton}
        summarySlot={summaryBar}
        filters={[
          {
            column: 'studentName',
            placeholder: 'Select student...',
            label: 'Student',
            type: 'combobox',
            options: studentOptions,
            emptyText: 'No students found.',
          },
          {
            column: 'classId',
            placeholder: 'Select class...',
            label: 'Class',
            type: 'combobox',
            options: classOptions,
            emptyText: 'No classes found.',
          },
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
            ],
          },
        ]}
      />
    </div>
  )
}
