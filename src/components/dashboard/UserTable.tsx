import type { ColumnDef } from '@tanstack/react-table'
import { Link } from '@tanstack/react-router'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import { setUserRole, removeUser } from '#/server/users'
import { useMutation } from '@tanstack/react-query'
import { CustomDataTable } from './custom-data-table'

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

const roleBadgeVariant = (role: string) => {
  switch (role) {
    case 'admin':
      return 'default' as const
    case 'staff':
      return 'warning' as const
    default:
      return 'success' as const
  }
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
    onSuccess: onUpdate,
  })

  const removeMutation = useMutation({
    mutationFn: (userId: string) => removeUser({ data: { userId } }),
    onSuccess: onUpdate,
  })

  const handleRemove = (userId: string) => {
    if (!confirm('Are you sure you want to remove this user?')) return
    removeMutation.mutate(userId)
  }

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
        return <Badge variant={roleBadgeVariant(role)}>{role}</Badge>
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
                <Badge variant="outline" className="cursor-pointer hover:bg-accent">
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
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const user = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                disabled={isLoading(user.id)}
              >
                ...
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {['admin', 'staff', 'student']
                .filter((r) => r !== (user.role ?? 'student'))
                .map((r) => (
                  <DropdownMenuItem
                    key={r}
                    onClick={() =>
                      roleMutation.mutate({ userId: user.id, role: r })
                    }
                  >
                    Set as {r}
                  </DropdownMenuItem>
                ))}
              <DropdownMenuItem
                variant="destructive"
                onClick={() => handleRemove(user.id)}
              >
                Remove user
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  return (
    <CustomDataTable
      columns={columns}
      data={users}
      filters={[
        { column: 'name', placeholder: 'Search by name...' },
        { column: 'email', placeholder: 'Search by email...' },
        {
          column: 'role',
          placeholder: 'Filter by role',
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
  )
}
