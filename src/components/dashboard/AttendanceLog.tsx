import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { downloadCsv } from '#/lib/csv'
import { formatDate } from '#/lib/utils'
import { listAttendance } from '#/server/attendance'
import { listClasses } from '#/server/classes'
import { currentAcademicYear } from '#/lib/financial-year'
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
      return 'success' as const
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

  const { data: classes = [], isLoading: classesLoading } = useQuery({
    queryKey: ['classes'],
    queryFn: () =>
      listClasses().then((data) =>
        data.map((c) => ({
          id: c.id,
          name: c.name,
          section: c.section,
          academicYear: c.academicYear,
        })),
      ),
  })

  const { data: records = [], isLoading: recordsLoading } = useQuery({
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

  // classId → academic year, for the Year column and filter.
  const classYearById = useMemo(() => {
    const map = new Map<number, string>()
    for (const c of classes) if (c.academicYear) map.set(c.id, c.academicYear)
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
        id: 'academicYear',
        header: 'Year',
        accessorFn: (row) =>
          row.classId != null ? (classYearById.get(row.classId) ?? '') : '',
        cell: ({ row }) => {
          const year = row.getValue('academicYear') as string
          return year ? (
            <Badge variant="outline" className="font-mono text-[10px]">
              {year}
            </Badge>
          ) : (
            '-'
          )
        },
        filterFn: (row, _id, value) => {
          if (!value || value === 'all') return true
          return (row.getValue('academicYear') as string) === value
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
    [classLabelById, classYearById],
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
    const labelFor = (id: number) => {
      const base = classLabelById.get(id) ?? `Class #${id}`
      const year = classYearById.get(id)
      return year ? `${base} · ${year}` : base
    }
    return [
      { label: 'All classes', value: 'all' },
      ...Array.from(ids)
        .sort((a, b) => labelFor(a).localeCompare(labelFor(b)))
        .map((id) => ({ label: labelFor(id), value: String(id) })),
    ]
  }, [records, classLabelById, classYearById])

  // Distinct academic years present in the records, most recent first.
  const yearOptions = useMemo(() => {
    const years = new Set<string>()
    for (const r of records) {
      const y = r.classId != null ? classYearById.get(r.classId) : null
      if (y) years.add(y)
    }
    return [
      { label: 'All years', value: 'all' },
      ...Array.from(years)
        .sort((a, b) => b.localeCompare(a))
        .map((y) => ({ label: y, value: y })),
    ]
  }, [records, classYearById])

  // Default the Year filter to the current academic year if it has records,
  // otherwise the most recent year present (or no filter if none).
  const defaultYear = useMemo(() => {
    const present = yearOptions.filter((o) => o.value !== 'all')
    if (present.length === 0) return null
    const current = currentAcademicYear()
    return present.some((o) => o.value === current) ? current : present[0].value
  }, [yearOptions])

  const summary = useMemo(() => {
    const source = filteredRows
    return {
      total: source.length,
      present: source.filter((r) => r.status === 'present').length,
      absent: source.filter((r) => r.status === 'absent').length,
      late: source.filter((r) => r.status === 'late').length,
    }
  }, [filteredRows])

  if (recordsLoading || classesLoading) {
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
      <Badge variant="success">Present: {summary.present}</Badge>
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
        defaultFilters={
          defaultYear ? [{ id: 'academicYear', value: defaultYear }] : undefined
        }
        filters={[
          {
            column: 'academicYear',
            placeholder: 'Filter by year',
            label: 'Year',
            type: 'select',
            options: yearOptions,
          },
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
