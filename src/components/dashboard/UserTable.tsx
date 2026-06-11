import { useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Link } from '@tanstack/react-router'
import { Badge } from '#/components/ui/badge'
import { setUserRole, removeUser } from '#/server/users'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { CustomDataTable } from './CustomDataTable'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { ConfirmDialog } from './ConfirmDialog'
import TrashIcon from '../icons/TrashIcon'
import { IconButton } from './IconButton'
import { getRoleVariant } from '#/lib/roles'

interface LinkedStudent {
  studentId: number
  studentName: string
  admissionNumber: string | null
}

interface User {
  id: string
  name: string
  email: string
  role?: string
  banned?: boolean
  linkedStudents: LinkedStudent[]
}

export function UserTable({
  users,
  onUpdate,
}: {
  users: User[]
  onUpdate: () => void
}) {
  const roleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      setUserRole({ data: { userId, role } }),
    onSuccess: () => {
      toast.success('Role updated')
      onUpdate()
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : 'Failed to update role'),
  })

  const removeMutation = useMutation({
    mutationFn: (userId: string) => removeUser({ data: { userId } }),
    onSuccess: () => {
      toast.success('User removed')
      onUpdate()
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : 'Failed to remove user'),
  })

  const [confirmUserId, setConfirmUserId] = useState<string | null>(null)

  const isLoading = (id: string) =>
    (roleMutation.isPending && roleMutation.variables?.userId === id) ||
    (removeMutation.isPending && removeMutation.variables === id)

  const columns: ColumnDef<User>[] = [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <span className="font-medium">{row.getValue('name')}</span>
      ),
    },
    {
      accessorKey: 'email',
      header: 'Email',
    },
    {
      accessorKey: 'role',
      header: 'Role',
      cell: ({ row }) => {
        const role = (row.getValue('role') as string) ?? 'student'
        return <Badge variant={getRoleVariant(role)}>{role}</Badge>
      },
      filterFn: (row, _id, value) => {
        if (!value || value === 'all') return true
        return (row.getValue('role') ?? 'student') === value
      },
    },
    {
      id: 'linkedStudents',
      header: 'Linked Students',
      cell: ({ row }) => {
        const students = row.original.linkedStudents
        if (students.length === 0) {
          return <span className="text-muted-foreground">-</span>
        }
        return (
          <div className="flex flex-wrap gap-1">
            {students.map((s) => (
              <Link
                key={s.studentId}
                to="/dashboard/students/$studentId"
                params={{ studentId: String(s.studentId) }}
              >
                <Badge
                  variant="outline"
                  className="cursor-pointer hover:bg-accent"
                >
                  {s.studentName}
                  {s.admissionNumber ? ` #${s.admissionNumber}` : ''}
                </Badge>
              </Link>
            ))}
          </div>
        )
      },
    },
    {
      id: 'role-action',
      header: 'Role',
      cell: ({ row }) => {
        const u = row.original
        const currentRole = u.role ?? 'student'
        return (
          <Select
            value={currentRole}
            onValueChange={(v) =>
              roleMutation.mutate({ userId: u.id, role: String(v) })
            }
            disabled={isLoading(u.id)}
          >
            <SelectTrigger className="h-8 w-28 text-xs capitalize">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="staff">Staff</SelectItem>
              <SelectItem value="student">Student</SelectItem>
            </SelectContent>
          </Select>
        )
      },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const u = row.original
        return (
          <IconButton
            size="xs"
            tooltip="Delete"
            icon={TrashIcon}
            className="text-destructive"
            disabled={isLoading(u.id)}
            onClick={() => setConfirmUserId(u.id)}
          />
        )
      },
    },
  ]

  return (
    <>
      <CustomDataTable
        columns={columns}
        data={users}
        filters={[
          {
            column: 'name',
            placeholder: 'Search by name...',
            label: 'Name',
          },
          {
            column: 'email',
            placeholder: 'Search by email...',
            label: 'Email',
          },
          {
            column: 'role',
            placeholder: 'Filter by role',
            label: 'Role',
            type: 'select',
            options: [
              { label: 'All roles', value: 'all' },
              { label: 'Admin', value: 'admin' },
              { label: 'Staff', value: 'staff' },
              { label: 'Student', value: 'student' },
            ],
          },
        ]}
      />
      <ConfirmDialog
        open={!!confirmUserId}
        onOpenChange={(open) => !open && setConfirmUserId(null)}
        title="Remove user?"
        description="This will permanently remove this user account. This action cannot be undone."
        confirmLabel="Remove"
        onConfirm={() => {
          if (confirmUserId) removeMutation.mutate(confirmUserId)
          setConfirmUserId(null)
        }}
      />
    </>
  )
}
