import { useState, useMemo, useEffect, useRef } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { CheckIcon, ChevronsUpDownIcon } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Card, CardContent } from '#/components/ui/card'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '#/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '#/components/ui/command'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { Badge } from '#/components/ui/badge'
import { cn } from '#/lib/utils'
import { listClasses } from '#/server/classes'
import { classLabel } from '#/lib/class-label'
import { currentAcademicYear } from '#/lib/financial-year'
import { getAttendanceByDate, markAttendance } from '#/server/attendance'
import type { AttendanceStatus } from '#/server/attendance'
import LoadIcon from '../icons/LoadIcon'

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'present', label: 'Present' },
  { value: 'absent', label: 'Absent' },
  { value: 'late', label: 'Late' },
]

interface StudentRecord {
  studentId: string
  name: string
  status: AttendanceStatus
}

export function AttendanceMarker() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedClass, setSelectedClass] = useState<{
    value: string
    label: string
  } | null>(null)
  const [students, setStudents] = useState<StudentRecord[]>([])
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<{
    value: string
    label: string
  } | null>({ value: 'all', label: 'All' })
  const [loaded, setLoaded] = useState(false)
  const [classPickerOpen, setClassPickerOpen] = useState(false)
  const [statusPickerOpen, setStatusPickerOpen] = useState(false)
  const [studentPickerOpen, setStudentPickerOpen] = useState(false)
  // '' until classes load; then defaults to the current academic year (or the
  // most recent one that has classes).
  const [selectedYear, setSelectedYear] = useState('')

  const { data: classes = [] } = useQuery({
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

  // Distinct academic years present on classes, most recent first.
  const years = useMemo(
    () =>
      Array.from(
        new Set(
          classes.map((c) => c.academicYear).filter((y): y is string => !!y),
        ),
      ).sort((a, b) => b.localeCompare(a)),
    [classes],
  )

  // Default the year once classes arrive: the current academic year if it has
  // classes, otherwise the most recent year available.
  useEffect(() => {
    if (selectedYear || years.length === 0) return
    const current = currentAcademicYear()
    setSelectedYear(years.includes(current) ? current : years[0])
  }, [years, selectedYear])

  // Only classes for the selected year appear in the picker.
  const classesForYear = useMemo(
    () => classes.filter((c) => c.academicYear === selectedYear),
    [classes, selectedYear],
  )

  const loadAttendance = async () => {
    if (!selectedClass) return
    setLoadingStudents(true)
    try {
      const result = (await getAttendanceByDate({
        data: { date, classId: Number(selectedClass.value) },
      })) as {
        students: { id: number; studentName: string }[]
        records: { studentUserId: string; status: string }[]
      }

      const studentRecords = result.students.map((sp) => {
        const profileId = String(sp.id)
        const record = result.records.find((r) => r.studentUserId === profileId)
        return {
          studentId: profileId,
          name: sp.studentName,
          // Rows predate the status enum, so narrow defensively.
          status: (record?.status as AttendanceStatus | undefined) ?? 'present',
        }
      })

      setStudents(studentRecords)
      setLoaded(true)
      setSearchQuery('')
      setStatusFilter({ value: 'all', label: 'All' })
    } catch {
      setStudents([])
      setLoaded(false)
    } finally {
      setLoadingStudents(false)
    }
  }

  const prevDateRef = useRef(date)
  useEffect(() => {
    if (prevDateRef.current !== date) {
      prevDateRef.current = date
      if (loaded && selectedClass) {
        loadAttendance()
      }
    }
  }, [date])

  const filteredStudents = useMemo(() => {
    let list = students
    if (searchQuery) {
      list = list.filter((s) => s.name === searchQuery)
    }
    if (statusFilter && statusFilter.value !== 'all') {
      list = list.filter((s) => s.status === statusFilter.value)
    }
    return list
  }, [students, searchQuery, statusFilter])

  const summary = useMemo(
    () => ({
      total: students.length,
      present: students.filter((s) => s.status === 'present').length,
      absent: students.filter((s) => s.status === 'absent').length,
      late: students.filter((s) => s.status === 'late').length,
    }),
    [students],
  )

  const setStatus = (studentId: string, status: AttendanceStatus) => {
    setStudents((prev) =>
      prev.map((s) => (s.studentId === studentId ? { ...s, status } : s)),
    )
  }

  const markAllAs = (status: AttendanceStatus) => {
    const visibleIds = new Set(filteredStudents.map((s) => s.studentId))
    setStudents((prev) =>
      prev.map((s) => (visibleIds.has(s.studentId) ? { ...s, status } : s)),
    )
  }

  const saveMutation = useMutation({
    mutationFn: () =>
      markAttendance({
        data: {
          date,
          records: students.map((s) => ({
            studentUserId: s.studentId,
            status: s.status,
          })),
        },
      }),
    onSuccess: () => toast.success('Attendance saved'),
    onError: () => toast.error('Failed to save attendance'),
  })

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

  const selectedClassName = selectedClass
    ? classes.find((c) => c.id === Number(selectedClass.value))
    : null

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card className="w-full bg-transparent shadow-none border-0 sm:max-w-fit">
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:gap-4">
            <div className="space-y-2">
              <Label>Academic year</Label>
              <Select
                value={selectedYear}
                onValueChange={(year) => {
                  setSelectedYear(year)
                  // A class from the previous year no longer applies.
                  setSelectedClass(null)
                  setLoaded(false)
                }}
                disabled={years.length === 0}
              >
                <SelectTrigger className="w-full sm:w-36">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={y} className="font-mono">
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Class + Load share a row on mobile; flow inline on desktop */}
            <div className="flex items-end gap-2 sm:contents">
              <div className="flex-1 space-y-2 sm:flex-none">
                <Label>Class</Label>
                <Popover
                  open={classPickerOpen}
                  onOpenChange={setClassPickerOpen}
                >
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={classPickerOpen}
                      className="w-full justify-between font-normal sm:w-auto sm:min-w-48"
                    >
                      {selectedClass ? selectedClass.label : 'Search class...'}
                      <ChevronsUpDownIcon className="size-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-[--radix-popover-trigger-width] p-0"
                    align="start"
                  >
                    <Command>
                      <CommandInput placeholder="Search class..." />
                      <CommandList>
                        <CommandEmpty>No class found.</CommandEmpty>
                        <CommandGroup>
                          {classesForYear.map((c) => {
                            // Picker is already scoped to selectedYear, so the
                            // year isn't repeated on each class here.
                            const base = classLabel(c.name, c.section)
                            const value = String(c.id)
                            return (
                              <CommandItem
                                key={c.id}
                                value={`${base} ${value}`}
                                onSelect={() => {
                                  setSelectedClass({ value, label: base })
                                  setLoaded(false)
                                  setClassPickerOpen(false)
                                }}
                              >
                                <CheckIcon
                                  className={cn(
                                    'size-4',
                                    selectedClass?.value === value
                                      ? 'opacity-100'
                                      : 'opacity-0',
                                  )}
                                />
                                <span>{base}</span>
                              </CommandItem>
                            )
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <Button
                onClick={loadAttendance}
                disabled={!selectedClass || loadingStudents}
                className="shrink-0"
              >
                {loadingStudents ? (
                  <LoadIcon className="h-4 w-4 animate-spin" />
                ) : (
                  <LoadIcon className="h-4 w-4" />
                )}
                {loadingStudents ? 'Loading...' : 'Load Students'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {loaded && students.length > 0 && (
        <>
          {/* Summary — two rows on mobile, single row on desktop */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <span className="text-sm font-medium text-muted-foreground">
              {selectedClassName
                ? `${selectedClassName.name}${selectedClassName.section ? ` - ${selectedClassName.section}` : ''}`
                : 'Class'}{' '}
              &middot; {date}
            </span>
            <Badge variant="outline">{summary.total} students</Badge>
            <Badge variant="outline">
              {Math.round((summary.present / summary.total) * 100)}% attendance
            </Badge>
            {/* Forces present/absent/late onto a second row on mobile only */}
            <div className="w-full sm:hidden" aria-hidden="true" />
            <Badge variant="default">{summary.present} present</Badge>
            <Badge variant="destructive">{summary.absent} absent</Badge>
            <Badge variant="warning">{summary.late} late</Badge>
          </div>

          {/* Student filter + bulk actions */}
          <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:gap-4">
            {/* Date + Student share a row on mobile; flow inline on desktop */}
            <div className="flex items-end gap-3 sm:contents">
              <div className="flex-1 space-y-2 sm:flex-none">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full sm:w-40"
                />
              </div>
              <div className="flex-1 space-y-2 sm:flex-none">
                <Label>Student</Label>
                <Popover
                  open={studentPickerOpen}
                  onOpenChange={setStudentPickerOpen}
                >
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={studentPickerOpen}
                      className={cn(
                        'w-full justify-between font-normal sm:w-56',
                        !searchQuery && 'text-muted-foreground',
                      )}
                    >
                      {searchQuery || 'All students'}
                      <ChevronsUpDownIcon className="size-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-[--radix-popover-trigger-width] p-0"
                    align="start"
                  >
                    <Command>
                      <CommandInput placeholder="Search student..." />
                      <CommandList>
                        <CommandEmpty>No students found.</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            value="All students"
                            onSelect={() => {
                              setSearchQuery('')
                              setStudentPickerOpen(false)
                            }}
                          >
                            <CheckIcon
                              className={cn(
                                'size-4',
                                !searchQuery ? 'opacity-100' : 'opacity-0',
                              )}
                            />
                            All students
                          </CommandItem>
                          {students.map((s) => (
                            <CommandItem
                              key={s.studentId}
                              value={s.name}
                              onSelect={() => {
                                setSearchQuery(s.name)
                                setStudentPickerOpen(false)
                              }}
                            >
                              <CheckIcon
                                className={cn(
                                  'size-4',
                                  searchQuery === s.name
                                    ? 'opacity-100'
                                    : 'opacity-0',
                                )}
                              />
                              {s.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            {/* Status filter + mark-all buttons share a row on mobile */}
            <div className="flex items-end gap-2 sm:contents">
              <div className="flex-1 space-y-2 sm:flex-none">
                <Label>Filter by status</Label>
                <Popover
                  open={statusPickerOpen}
                  onOpenChange={setStatusPickerOpen}
                >
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={statusPickerOpen}
                      className="w-full min-w-0 justify-between font-normal sm:w-auto sm:min-w-36"
                    >
                      {statusFilter ? statusFilter.label : 'Select status...'}
                      <ChevronsUpDownIcon className="size-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-[--radix-popover-trigger-width] p-0"
                    align="start"
                  >
                    <Command>
                      <CommandList>
                        <CommandGroup>
                          {STATUS_OPTIONS.map((opt) => (
                            <CommandItem
                              key={opt.value}
                              value={opt.label}
                              onSelect={() => {
                                setStatusFilter(opt)
                                setStatusPickerOpen(false)
                              }}
                            >
                              <CheckIcon
                                className={cn(
                                  'size-4',
                                  statusFilter?.value === opt.value
                                    ? 'opacity-100'
                                    : 'opacity-0',
                                )}
                              />
                              {opt.label}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => markAllAs('present')}
                >
                  Mark all present
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => markAllAs('absent')}
                >
                  Mark all absent
                </Button>
              </div>
            </div>
          </div>

          {/* Student table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-64">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.map((s, i) => (
                <TableRow key={s.studentId}>
                  <TableCell className="text-muted-foreground">
                    {i + 1}
                  </TableCell>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell>
                    <Badge variant={statusBadgeVariant(s.status)}>
                      {s.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant={s.status === 'present' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setStatus(s.studentId, 'present')}
                      >
                        P
                      </Button>
                      <Button
                        variant={
                          s.status === 'absent' ? 'destructive' : 'outline'
                        }
                        size="sm"
                        onClick={() => setStatus(s.studentId, 'absent')}
                      >
                        A
                      </Button>
                      <Button
                        variant={s.status === 'late' ? 'warning' : 'outline'}
                        size="sm"
                        onClick={() => setStatus(s.studentId, 'late')}
                      >
                        L
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredStudents.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center text-muted-foreground"
                  >
                    {searchQuery ||
                    (statusFilter && statusFilter.value !== 'all')
                      ? 'No students match the current filters'
                      : 'No students found in this class'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {/* Save */}
          <div className="flex items-center gap-4">
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? 'Saving...' : 'Save Attendance'}
            </Button>
            <span className="text-sm text-muted-foreground">
              Saves attendance for all {summary.total} students, not just
              filtered view
            </span>
          </div>
        </>
      )}

      {loaded && students.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No active students found in this class. Add students to the class
          first.
        </p>
      )}
    </div>
  )
}
