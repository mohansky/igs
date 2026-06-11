import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import TrashIcon from '#/components/icons/TrashIcon'
import { IconButton } from '#/components/dashboard/IconButton'
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
import { Switch } from '#/components/ui/switch'
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
import { downloadCsv } from '#/lib/csv'
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

interface ParentInfo {
  parentUserId: string
  parentName: string
  parentEmail: string
  relation: string | null
}

interface StudentRow {
  id: number
  studentName: string
  userId: string | null
  classId: number | null
  className: string | null
  classSection: string | null
  currentClassId: number | null
  currentClassName: string | null
  currentClassSection: string | null
  admissionNumber: string | null
  gender: string | null
  parentPhone: string | null
  isActive: boolean | null
  photoUrl: string | null
  userEmail: string | null
  parents: ParentInfo[]
}

function classLabel(name: string | null, section: string | null) {
  if (!name) return '-'
  return section ? `${name} ${section}` : name
}

function effectiveClassLabel(row: {
  className: string | null
  classSection: string | null
  currentClassName: string | null
  currentClassSection: string | null
}) {
  const current = classLabel(row.currentClassName, row.currentClassSection)
  if (current !== '-') return current
  return classLabel(row.className, row.classSection)
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
        students.map((s) => effectiveClassLabel(s)).filter((l) => l !== '-'),
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
      cell: ({ row }) => (
        <span className="font-medium">{row.getValue('studentName')}</span>
      ),
    },
    {
      accessorKey: 'admissionNumber',
      header: 'Admission #',
      cell: ({ row }) => row.getValue('admissionNumber') ?? '-',
    },
    {
      id: 'currentClass',
      header: 'Class',
      accessorFn: (row) => effectiveClassLabel(row),
      cell: ({ row }) => <span>{effectiveClassLabel(row.original)}</span>,
      filterFn: (row, _id, value) => {
        if (!value || value === 'all') return true
        const label = effectiveClassLabel(row.original)
        if (value === '__none') return label === '-'
        return label === value
      },
    },
    {
      accessorKey: 'gender',
      header: 'Gender',
      cell: ({ row }) => (
        <span className="capitalize">{row.getValue('gender') ?? '-'}</span>
      ),
    },
    {
      accessorKey: 'parentPhone',
      header: 'Parent Phone',
      cell: ({ row }) => row.getValue('parentPhone') ?? '-',
    },
    {
      id: 'linkedParents',
      header: 'Linked Parents',
      enableSorting: false,
      cell: ({ row }) => {
        const parents = row.original.parents
        if (!parents || parents.length === 0) {
          return <span className="text-muted-foreground">-</span>
        }
        return (
          <div className="space-y-1">
            {parents.map((p) => (
              <div key={p.parentUserId}>
                <p className="text-sm font-medium">
                  {p.parentName}
                  {p.relation && (
                    <span className="ml-1 text-xs text-muted-foreground">
                      ({p.relation})
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">{p.parentEmail}</p>
              </div>
            ))}
          </div>
        )
      },
    },
    {
      accessorKey: 'isActive',
      header: 'Status',
      cell: ({ row }) => {
        const student = row.original
        const active = student.isActive !== false
        const pending =
          toggleMutation.isPending &&
          toggleMutation.variables?.studentId === student.id
        return (
          <div className="flex items-center gap-2">
            <Switch
              checked={active}
              disabled={pending}
              onCheckedChange={(checked) =>
                toggleMutation.mutate({
                  studentId: student.id,
                  isActive: checked,
                })
              }
            />
            {active ? (
              <Badge variant="default">Active</Badge>
            ) : (
              <Badge variant="destructive">Inactive</Badge>
            )}
          </div>
        )
      },
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
      header: 'Actions',
      enableSorting: false,
      cell: ({ row }) => {
        const student = row.original
        return (
          <div className="flex gap-1">
            <Link
              to="/dashboard/students/$studentId"
              params={{ studentId: String(student.id) }}
            >
              <Button variant="ghost" size="xs" title="View">
                <EyeIcon size={16} />
              </Button>
            </Link>
            {userRole === 'admin' && (
              <IconButton
                tooltip="Delete"
                icon={TrashIcon}
                className="text-destructive"
                size="xs"
                onClick={() => setDeleteTarget(student)}
              />
            )}
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
                  class: classLabel(s.className, s.classSection),
                  currentClass: classLabel(
                    s.currentClassName,
                    s.currentClassSection,
                  ),
                })),
                [
                  { key: 'studentName', label: 'Name' },
                  { key: 'admissionNumber', label: 'Admission #' },
                  { key: 'class', label: 'Admitted to' },
                  { key: 'currentClass', label: 'Current Class' },
                  { key: 'gender', label: 'Gender' },
                  { key: 'parentPhone', label: 'Parent Phone' },
                  { key: 'userEmail', label: 'Email' },
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
            filters={[
              {
                column: 'studentName',
                placeholder: 'Search by name...',
                label: 'Name',
              },
              {
                column: 'admissionNumber',
                placeholder: 'Search admission #...',
                label: 'Admission #',
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
