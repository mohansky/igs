import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import TrashIcon from '#/components/icons/TrashIcon'
import {
  MoreVerticalIcon,
  UserBlock01Icon,
  UserCheck01Icon,
} from 'hugeicons-react'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { ColumnDef } from '@tanstack/react-table'
import { Button } from '#/components/ui/button'
import { Badge } from '#/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '#/components/ui/alert-dialog'
import { CustomDataTable } from '#/components/dashboard/CustomDataTable'
import { Skeleton } from '#/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import { Card, CardContent } from '#/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '#/components/ui/avatar'
import {
  listStudents,
  toggleStudentActive,
  deleteStudent,
  bulkSetCurrentClass,
  bulkSetStudentActive,
} from '#/server/students'
import { listClasses } from '#/server/classes'
import { classLabel, classLabelWithYear } from '#/lib/class-label'
import { downloadCsv } from '#/lib/csv'
import { genderShort } from '#/lib/guardians'
import { formatDate } from '#/lib/utils'
import EyeIcon from '#/components/icons/EyeIcon'
import DownloadIcon from '#/components/icons/DownloadIcon'
import AddIcon from '#/components/icons/AddIcon'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'

export const Route = createFileRoute('/dashboard/students/')({
  beforeLoad: ({ context }) => {
    const userRole =
      (context.session.user as { role?: string }).role ?? 'student'
    if (userRole !== 'admin' && userRole !== 'staff') {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: StudentsListPage,
})

interface StudentRow {
  id: number
  studentName: string
  userId: string | null
  classId: number | null
  className: string | null
  classSection: string | null
  classAcademicYear: string | null
  currentClassId: number | null
  currentClassName: string | null
  currentClassSection: string | null
  currentClassAcademicYear: string | null
  admissionNumber: string | null
  gender: string | null
  dateOfBirth: string | null
  address: string | null
  // Resolved from the three guardian slots by listStudents.
  fatherName: string | null
  fatherPhone: string | null
  motherName: string | null
  motherPhone: string | null
  email: string | null
  emergencyContact: string | null
  emergencyPhone: string | null
  isActive: boolean | null
  photoUrl: string | null
}

function PhoneLink({ phone }: { phone: string | null }) {
  if (!phone) return <span className="text-muted-foreground">-</span>
  return (
    <a
      href={`tel:${phone.replace(/\s+/g, '')}`}
      className="text-primary hover:underline"
    >
      {phone}
    </a>
  )
}

const orDash = (value: string | null) =>
  value ? value : <span className="text-muted-foreground">-</span>

type ClassRowFields = {
  className: string | null
  classSection: string | null
  classAcademicYear: string | null
  currentClassName: string | null
  currentClassSection: string | null
  currentClassAcademicYear: string | null
}

// A student's effective class is their current class, falling back to the
// admitted class. Returns the name+section label and the academic year
// separately so the year can render as a badge.
function effectiveClass(row: ClassRowFields): {
  label: string
  year: string | null
} {
  if (classLabel(row.currentClassName, row.currentClassSection) !== '-') {
    return {
      label: classLabel(row.currentClassName, row.currentClassSection),
      year: row.currentClassAcademicYear,
    }
  }
  return {
    label: classLabel(row.className, row.classSection),
    year: row.classAcademicYear,
  }
}

// Plain-text form (year folded in) for filtering, sorting and CSV export, where
// a badge can't be rendered and the year must still disambiguate.
function effectiveClassText(row: ClassRowFields): string {
  const { label, year } = effectiveClass(row)
  if (label === '-' || !year) return label
  return `${label} · ${year}`
}

function initialsFrom(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function resolvePhotoUrl(image: string | null | undefined) {
  if (!image) return undefined
  if (image.startsWith('http') || image.startsWith('data:')) return image
  const base = import.meta.env.VITE_R2_BASE_URL ?? ''
  if (!base) return image.startsWith('/') ? image : `/${image}`
  const baseWithSlash = base.endsWith('/') ? base : `${base}/`
  return `${baseWithSlash}${image.replace(/^\//, '')}`
}

function StudentsListPage() {
  const { session } = Route.useRouteContext()
  const userRole = (session.user as { role?: string }).role ?? 'student'
  const queryClient = useQueryClient()
  const [deleteTarget, setDeleteTarget] = useState<StudentRow | null>(null)
  const [selected, setSelected] = useState<StudentRow[]>([])
  const [changeClassOpen, setChangeClassOpen] = useState(false)
  const [changeClassValue, setChangeClassValue] = useState<string>('')

  const { data: students = [], isLoading } = useQuery({
    queryKey: ['students'],
    queryFn: () => listStudents() as Promise<StudentRow[]>,
  })

  const { data: classesList = [] } = useQuery({
    queryKey: ['classes-active'],
    queryFn: () => listClasses(),
    enabled: userRole === 'admin',
  })

  const currentClassOptions = [
    { label: 'All', value: 'all' },
    { label: 'Unassigned', value: '__none' },
    ...Array.from(
      new Set(
        students.map((s) => effectiveClassText(s)).filter((l) => l !== '-'),
      ),
    )
      .sort()
      .map((l) => ({ label: l, value: l })),
  ]

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['students'] })

  const toggleMutation = useMutation({
    mutationFn: (vars: { studentId: number; isActive: boolean }) =>
      toggleStudentActive({ data: vars }),
    onSuccess: (_, vars) => {
      toast.success(
        vars.isActive
          ? 'Student marked as active'
          : 'Student marked as inactive',
      )
      invalidate()
    },
    onError: () => toast.error('Failed to update student status'),
  })

  const deleteMutation = useMutation({
    mutationFn: (studentId: number) => deleteStudent({ data: { studentId } }),
    onSuccess: () => {
      toast.success('Student deleted')
      invalidate()
    },
    onError: () => toast.error('Failed to delete student'),
  })

  const bulkClassMutation = useMutation({
    mutationFn: (vars: {
      studentIds: number[]
      currentClassId: number | null
    }) => bulkSetCurrentClass({ data: vars }),
    onSuccess: (res) => {
      toast.success(`Updated current class for ${res.updated} student(s)`)
      setChangeClassOpen(false)
      setChangeClassValue('')
      setSelected([])
      invalidate()
    },
    onError: () => toast.error('Failed to update current class'),
  })

  const bulkActiveMutation = useMutation({
    mutationFn: (vars: { studentIds: number[]; isActive: boolean }) =>
      bulkSetStudentActive({ data: vars }),
    onSuccess: (res, vars) => {
      toast.success(
        `${vars.isActive ? 'Activated' : 'Deactivated'} ${res.updated} student(s)`,
      )
      setSelected([])
      invalidate()
    },
    onError: () => toast.error('Failed to update status'),
  })

  const columns: ColumnDef<StudentRow>[] = [
    {
      id: 'photo',
      header: '',
      enableSorting: false,
      enableColumnFilter: false,
      cell: ({ row }) => {
        const s = row.original
        return (
          <Avatar className="size-8 rounded-md">
            <AvatarImage
              src={resolvePhotoUrl(s.photoUrl)}
              alt={s.studentName}
              className="object-cover"
            />
            <AvatarFallback className="rounded-md text-xs">
              {initialsFrom(s.studentName)}
            </AvatarFallback>
          </Avatar>
        )
      },
    },
    {
      accessorKey: 'studentName',
      header: 'Name',
      // Admission number sits under the name, and the name search matches it.
      cell: ({ row }) => {
        const s = row.original
        return (
          <div className="flex flex-col">
            <Link
              to="/dashboard/students/$studentId"
              params={{ studentId: String(s.id) }}
              className="font-medium hover:underline"
            >
              {s.studentName}
            </Link>
            {(s.admissionNumber || s.isActive === false) && (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                {s.admissionNumber}
                {s.isActive === false && (
                  <Badge variant="destructive" className="text-[10px]">
                    Inactive
                  </Badge>
                )}
              </span>
            )}
          </div>
        )
      },
      filterFn: (row, _id, value) => {
        const q = String(value ?? '')
          .trim()
          .toLowerCase()
        if (!q) return true
        const s = row.original
        return (
          s.studentName.toLowerCase().includes(q) ||
          (s.admissionNumber ?? '').toLowerCase().includes(q)
        )
      },
    },
    {
      id: 'currentClass',
      header: 'Class',
      accessorFn: (row) => effectiveClassText(row),
      cell: ({ row }) => {
        const { label, year } = effectiveClass(row.original)
        if (label === '-') return <span>-</span>
        return (
          <div className="flex flex-col items-start gap-0.5">
            {label}
            {year && (
              <Badge variant="outline" className="font-mono text-[10px]">
                {year}
              </Badge>
            )}
          </div>
        )
      },
      filterFn: (row, _id, value) => {
        if (!value || value === 'all') return true
        const text = effectiveClassText(row.original)
        if (value === '__none') return text === '-'
        return text === value
      },
    },
    {
      accessorKey: 'gender',
      header: 'Gender',
      cell: ({ row }) => genderShort(row.original.gender),
    },
    {
      accessorKey: 'dateOfBirth',
      header: 'DoB',
      cell: ({ row }) => formatDate(row.original.dateOfBirth),
    },
    {
      accessorKey: 'address',
      header: 'Address',
      enableSorting: false,
      cell: ({ row }) => {
        const address = row.original.address
        if (!address) return orDash(null)
        // Wraps to at most two lines; the full address is in the tooltip.
        return (
          <div
            className="line-clamp-2 min-w-48 max-w-64 whitespace-normal"
            title={address}
          >
            {address}
          </div>
        )
      },
    },
    {
      accessorKey: 'motherName',
      header: "Mother's Name",
      cell: ({ row }) => orDash(row.original.motherName),
    },
    {
      accessorKey: 'motherPhone',
      header: "Mother's Contact",
      enableSorting: false,
      cell: ({ row }) => <PhoneLink phone={row.original.motherPhone} />,
    },
    {
      accessorKey: 'fatherName',
      header: "Father's Name",
      cell: ({ row }) => orDash(row.original.fatherName),
    },
    {
      accessorKey: 'fatherPhone',
      header: "Father's Contact",
      enableSorting: false,
      cell: ({ row }) => <PhoneLink phone={row.original.fatherPhone} />,
    },
    {
      accessorKey: 'email',
      header: 'Email',
      cell: ({ row }) => {
        const email = row.original.email
        return email ? (
          <a href={`mailto:${email}`} className="text-primary hover:underline">
            {email}
          </a>
        ) : (
          orDash(null)
        )
      },
    },
    {
      accessorKey: 'emergencyPhone',
      header: 'Emergency Contact',
      enableSorting: false,
      cell: ({ row }) => {
        const s = row.original
        return (
          <div className="flex flex-col">
            <PhoneLink phone={s.emergencyPhone} />
            {s.emergencyContact && (
              <span className="text-xs text-muted-foreground">
                {s.emergencyContact}
              </span>
            )}
          </div>
        )
      },
    },
    {
      // Not shown (hiddenColumns below): inactive students get a badge under
      // their name instead. Kept as a column so the Status filter works.
      accessorKey: 'isActive',
      header: 'Status',
      filterFn: (row, _id, value) => {
        if (!value || value === 'all') return true
        const active = row.getValue('isActive') as boolean | null
        if (value === 'active') return active !== false
        if (value === 'inactive') return active === false
        return true
      },
    },
    {
      id: 'actions',
      header: () => <span className="sr-only">Actions</span>,
      enableSorting: false,
      // Pinned to the right edge while the other columns scroll sideways,
      // as on the Fees table.
      meta: {
        className:
          'sticky right-0 z-10 bg-muted shadow-[-6px_0_6px_-6px_rgba(0,0,0,0.25)]',
      },
      cell: ({ row }) => {
        const student = row.original
        const active = student.isActive !== false
        const pending =
          toggleMutation.isPending &&
          toggleMutation.variables?.studentId === student.id
        return (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label={`Actions for ${student.studentName}`}
                >
                  <MoreVerticalIcon className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link
                    to="/dashboard/students/$studentId"
                    params={{ studentId: String(student.id) }}
                  >
                    <EyeIcon className="size-4" />
                    View profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={pending}
                  onSelect={() =>
                    toggleMutation.mutate({
                      studentId: student.id,
                      isActive: !active,
                    })
                  }
                >
                  {active ? (
                    <UserBlock01Icon className="size-4" />
                  ) : (
                    <UserCheck01Icon className="size-4" />
                  )}
                  {active ? 'Mark as inactive' : 'Mark as active'}
                </DropdownMenuItem>
                {userRole === 'admin' && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      onSelect={() => setDeleteTarget(student)}
                    >
                      <TrashIcon className="size-4" />
                      Delete
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )
      },
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">Students</h1>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() =>
              downloadCsv(
                students.map((s) => ({
                  ...s,
                  gender: genderShort(s.gender),
                  class: classLabelWithYear(
                    s.className,
                    s.classSection,
                    s.classAcademicYear,
                  ),
                  currentClass: classLabelWithYear(
                    s.currentClassName,
                    s.currentClassSection,
                    s.currentClassAcademicYear,
                  ),
                })),
                [
                  { key: 'studentName', label: 'Name' },
                  { key: 'admissionNumber', label: 'Admission #' },
                  { key: 'class', label: 'Admitted to' },
                  { key: 'currentClass', label: 'Current Class' },
                  { key: 'gender', label: 'Gender' },
                  { key: 'dateOfBirth', label: 'DoB' },
                  { key: 'address', label: 'Address' },
                  { key: 'motherName', label: "Mother's Name" },
                  { key: 'motherPhone', label: "Mother's Contact Number" },
                  { key: 'fatherName', label: "Father's Name" },
                  { key: 'fatherPhone', label: "Father's Contact Number" },
                  { key: 'email', label: 'Email Id' },
                  { key: 'emergencyContact', label: 'Emergency Contact' },
                  {
                    key: 'emergencyPhone',
                    label: 'Emergency Contact Number',
                  },
                  { key: 'isActive', label: 'Active' },
                ],
                'students-export',
              )
            }
            disabled={students.length === 0}
          >
            <DownloadIcon className="h-4 w-4" />
            Export CSV
          </Button>
          <Link to="/dashboard/students/new">
            <Button>
              <AddIcon className="h-4 w-4" /> Add Student
            </Button>
          </Link>
        </div>
      </div>

      {isLoading ? (
        <TableSkeleton rows={8} cols={5} />
      ) : (
        <>
          {userRole === 'admin' && selected.length > 0 && (
            <div className="sticky top-2 z-20 flex flex-wrap items-center gap-2 rounded-lg border bg-background/95 px-3 py-2 shadow-sm backdrop-blur">
              <span className="text-sm font-medium">
                {selected.length} selected
              </span>
              <div className="ml-auto flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setChangeClassValue('')
                    setChangeClassOpen(true)
                  }}
                >
                  Change Current Class
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={bulkActiveMutation.isPending}
                  onClick={() =>
                    bulkActiveMutation.mutate({
                      studentIds: selected.map((s) => s.id),
                      isActive: true,
                    })
                  }
                >
                  Activate
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={bulkActiveMutation.isPending}
                  onClick={() =>
                    bulkActiveMutation.mutate({
                      studentIds: selected.map((s) => s.id),
                      isActive: false,
                    })
                  }
                >
                  Deactivate
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelected([])}
                >
                  Clear
                </Button>
              </div>
            </div>
          )}
          <CustomDataTable
            tableId="students"
            columns={columns}
            data={students}
            enableSelection={userRole === 'admin'}
            onSelectionChange={setSelected}
            hiddenColumns={['isActive']}
            filters={[
              {
                column: 'studentName',
                placeholder: 'Name or admission #...',
                label: 'Search',
              },
              {
                column: 'currentClass',
                placeholder: 'Filter by class',
                label: 'Class',
                type: 'select',
                options: currentClassOptions,
              },
              {
                column: 'isActive',
                placeholder: 'Filter by status',
                label: 'Status',
                type: 'select',
                options: [
                  { label: 'All', value: 'all' },
                  { label: 'Active', value: 'active' },
                  { label: 'Inactive', value: 'inactive' },
                ],
              },
            ]}
          />
        </>
      )}

      <Dialog
        open={changeClassOpen}
        onOpenChange={(open) => {
          if (!bulkClassMutation.isPending) setChangeClassOpen(open)
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Change Current Class</DialogTitle>
            <DialogDescription>
              Update the current class for {selected.length} selected
              student(s). The "Admitted to" class is preserved.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <label className="text-sm font-medium">Class</label>
            <Select
              value={changeClassValue}
              onValueChange={setChangeClassValue}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Pick a class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">Unassigned (clear)</SelectItem>
                {classesList.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.section ? `${c.name} ${c.section}` : c.name}
                    {c.academicYear ? (
                      <span className="ml-1 font-mono text-xs text-muted-foreground">
                        {c.academicYear}
                      </span>
                    ) : null}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setChangeClassOpen(false)}
              disabled={bulkClassMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              disabled={!changeClassValue || bulkClassMutation.isPending}
              onClick={() =>
                bulkClassMutation.mutate({
                  studentIds: selected.map((s) => s.id),
                  currentClassId:
                    changeClassValue === '__none'
                      ? null
                      : Number(changeClassValue),
                })
              }
            >
              {bulkClassMutation.isPending ? 'Updating...' : 'Apply'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Student</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete{' '}
              <span className="font-medium text-foreground">
                {deleteTarget?.studentName}
              </span>
              ? This will remove their profile, but attendance and fee records
              will remain. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (deleteTarget) {
                  deleteMutation.mutate(deleteTarget.id)
                  setDeleteTarget(null)
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function TableSkeleton({
  rows = 5,
  cols = 4,
}: {
  rows?: number
  cols?: number
}) {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="flex gap-2 border-b p-4">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="divide-y">
          {Array.from({ length: rows }).map((_, r) => (
            <div key={r} className="flex items-center gap-4 px-4 py-3">
              {Array.from({ length: cols }).map((_, c) => (
                <Skeleton
                  key={c}
                  className="h-4 flex-1"
                  style={{ maxWidth: c === 0 ? '160px' : '120px' }}
                />
              ))}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
