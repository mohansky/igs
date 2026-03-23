import { createFileRoute, Link, redirect } from '@tanstack/react-router'
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
import { CustomDataTable } from '#/components/dashboard/custom-data-table'
import {
  listStudents,
  toggleStudentActive,
  deleteStudent,
} from '#/server/students'
import { downloadCsv } from '#/lib/csv'

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
  admissionNumber: string | null
  gender: string | null
  parentPhone: string | null
  isActive: boolean | null
  userEmail: string | null
  parents: ParentInfo[]
}

function StudentsListPage() {
  const { session } = Route.useRouteContext()
  const userRole = (session.user as { role?: string }).role ?? 'student'
  const queryClient = useQueryClient()
  const [deleteTarget, setDeleteTarget] = useState<StudentRow | null>(null)

  const { data: students = [], isLoading } = useQuery({
    queryKey: ['students'],
    queryFn: () => listStudents() as Promise<StudentRow[]>,
  })

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['students'] })

  const toggleMutation = useMutation({
    mutationFn: (vars: { studentId: number; isActive: boolean }) =>
      toggleStudentActive({ data: vars }),
    onSuccess: (_, vars) => {
      toast.success(
        vars.isActive ? 'Student marked as active' : 'Student marked as inactive',
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

  const columns: ColumnDef<StudentRow>[] = [
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
      accessorKey: 'gender',
      header: 'Gender',
      cell: ({ row }) => (
        <span className="capitalize">{row.getValue('gender') ?? '-'}</span>
      ),
      filterFn: (row, _id, value) => {
        if (!value || value === 'all') return true
        return row.getValue('gender') === value
      },
    },
    {
      accessorKey: 'parentPhone',
      header: 'Parent Phone',
      cell: ({ row }) => row.getValue('parentPhone') ?? '-',
    },
    {
      id: 'linkedParents',
      header: 'Linked Parents',
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
        const active = row.getValue('isActive') as boolean | null
        return active === false ? (
          <Badge variant="destructive">Inactive</Badge>
        ) : (
          <Badge variant="default">Active</Badge>
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
      cell: ({ row }) => {
        const student = row.original
        const active = student.isActive !== false
        return (
          <div className="flex gap-1">
            <Link
              to="/dashboard/students/$studentId"
              params={{ studentId: String(student.id) }}
            >
              <Button variant="outline" size="xs">
                View
              </Button>
            </Link>
            <Button
              // variant="ghost"
              size="xs"
              onClick={() =>
                toggleMutation.mutate({
                  studentId: student.id,
                  isActive: !active,
                })
              }
            >
              {active ? 'Deactivate' : 'Activate'}
            </Button>
            {userRole === 'admin' && (
              <Button
                variant="destructive"
                size="xs"
                onClick={() => setDeleteTarget(student)}
              >
                Delete
              </Button>
            )}
          </div>
        )
      },
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Students</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() =>
              downloadCsv(
                students,
                [
                  { key: 'studentName', label: 'Name' },
                  { key: 'admissionNumber', label: 'Admission #' },
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
            Export CSV
          </Button>
          <Link to="/dashboard/students/new">
            <Button>Add Student</Button>
          </Link>
        </div>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : (
        <CustomDataTable
          columns={columns}
          data={students}
          filters={[
            { column: 'studentName', placeholder: 'Search by name...' },
            {
              column: 'admissionNumber',
              placeholder: 'Search admission #...',
            },
            {
              column: 'gender',
              placeholder: 'Filter by gender',
              type: 'select',
              options: [
                { label: 'All', value: 'all' },
                { label: 'Male', value: 'male' },
                { label: 'Female', value: 'female' },
                { label: 'Other', value: 'other' },
              ],
            },
            {
              column: 'isActive',
              placeholder: 'Filter by status',
              type: 'select',
              options: [
                { label: 'All', value: 'all' },
                { label: 'Active', value: 'active' },
                { label: 'Inactive', value: 'inactive' },
              ],
            },
          ]}
        />
      )}

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
