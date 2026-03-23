import { useState, useMemo, useEffect, useRef } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Card, CardContent } from '#/components/ui/card'
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem, 
} from '#/components/ui/combobox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { Badge } from '#/components/ui/badge'
import { listClasses } from '#/server/classes'
import { getAttendanceByDate, markAttendance } from '#/server/attendance'

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
        const record = result.records.find(
          (r) => r.studentUserId === profileId,
        )
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
      const q = searchQuery.toLowerCase()
      list = list.filter((s) => s.name.toLowerCase().includes(q))
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
        return 'secondary' as const
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
      <Card className='bg-transparent max-w-fit shadow-none border-0'>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <Label>Class</Label>
              <Combobox
                value={selectedClass}
                onValueChange={(val) => {
                  setSelectedClass(val)
                  setLoaded(false)
                }}
              >
                <ComboboxInput
                  placeholder="Search class..."
                  className="min-w-48"
                  showClear={!!selectedClass}
                />
                <ComboboxContent>
                  <ComboboxList>
                    {classes.map((c) => {
                      const label = `${c.name}${c.section ? ` - ${c.section}` : ''}`
                      return (
                        <ComboboxItem
                          key={c.id}
                          value={{ value: String(c.id), label }}
                        >
                          {label}
                        </ComboboxItem>
                      )
                    })}
                  </ComboboxList> 
                </ComboboxContent>
              </Combobox>
            </div>
            <Button
              onClick={loadAttendance}
              disabled={!selectedClass || loadingStudents}
            >
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
            <Badge variant="secondary">{summary.late} late</Badge>
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
              <Label>Search student</Label>
              <Input
                placeholder="Type a name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-56"
              />
            </div>
            <div className="space-y-2">
              <Label>Filter by status</Label>
              <Combobox
                value={statusFilter}
                onValueChange={(val) => setStatusFilter(val)}
              >
                <ComboboxInput
                  placeholder="Select status..."
                  className="min-w-36"
                />
                <ComboboxContent>
                  <ComboboxList>
                    {[
                      { value: 'all', label: 'All' },
                      { value: 'present', label: 'Present' },
                      { value: 'absent', label: 'Absent' },
                      { value: 'late', label: 'Late' },
                    ].map((opt) => (
                      <ComboboxItem key={opt.value} value={opt}>
                        {opt.label}
                      </ComboboxItem>
                    ))}
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>
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
                        variant={
                          s.status === 'present' ? 'default' : 'outline'
                        }
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
                        variant={
                          s.status === 'late' ? 'secondary' : 'outline'
                        }
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
                    {searchQuery || (statusFilter && statusFilter.value !== 'all')
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
