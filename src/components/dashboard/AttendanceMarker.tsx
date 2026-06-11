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
import { Badge } from '#/components/ui/badge'
import { cn } from '#/lib/utils'
import { listClasses } from '#/server/classes'
import { getAttendanceByDate, markAttendance } from '#/server/attendance'
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
  status: string
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

  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: () =>
      listClasses().then((data) =>
        data.map((c) => ({ id: c.id, name: c.name, section: c.section })),
      ),
  })

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
          status: record?.status ?? 'present',
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

  const setStatus = (studentId: string, status: string) => {
    setStudents((prev) =>
      prev.map((s) => (s.studentId === studentId ? { ...s, status } : s)),
    )
  }

  const markAllAs = (status: string) => {
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
      <Card className="bg-transparent max-w-fit shadow-none border-0">
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label>Class</Label>
              <Popover open={classPickerOpen} onOpenChange={setClassPickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={classPickerOpen}
                    className="min-w-48 justify-between font-normal"
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
                        {classes.map((c) => {
                          const label = `${c.name}${c.section ? ` - ${c.section}` : ''}`
                          const value = String(c.id)
                          return (
                            <CommandItem
                              key={c.id}
                              value={`${label} ${value}`}
                              onSelect={() => {
                                setSelectedClass({ value, label })
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
                              {label}
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
            >
              {loadingStudents ? (
                <LoadIcon className="h-4 w-4 animate-spin" />
              ) : (
                <LoadIcon className="h-4 w-4" />
              )}
              {loadingStudents ? 'Loading...' : 'Load Students'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {loaded && students.length > 0 && (
        <>
          {/* Summary */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground">
              {selectedClassName
                ? `${selectedClassName.name}${selectedClassName.section ? ` - ${selectedClassName.section}` : ''}`
                : 'Class'}{' '}
              &middot; {date}
            </span>
            <Badge variant="outline">{summary.total} students</Badge>
            <Badge variant="default">{summary.present} present</Badge>
            <Badge variant="destructive">{summary.absent} absent</Badge>
            <Badge variant="warning">{summary.late} late</Badge>
            {summary.total > 0 && (
              <Badge variant="outline">
                {Math.round((summary.present / summary.total) * 100)}%
                attendance
              </Badge>
            )}
          </div>

          {/* Student filter + bulk actions */}
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="space-y-2">
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
                      'w-56 justify-between font-normal',
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
            <div className="space-y-2">
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
                    className="min-w-36 justify-between font-normal"
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
