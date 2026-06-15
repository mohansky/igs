import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { ColumnDef } from '@tanstack/react-table'
import TrashIcon from '#/components/icons/TrashIcon'
import EyeIcon from '#/components/icons/EyeIcon'
import { IconButton } from '#/components/dashboard/IconButton'
import { Button } from '#/components/ui/button'
import { Badge } from '#/components/ui/badge'
import { Switch } from '#/components/ui/switch'
import { Avatar, AvatarFallback, AvatarImage } from '#/components/ui/avatar'
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
import { listStaff, toggleStaffActive, deleteStaff } from '#/server/staff'
import { displayEmail } from '#/lib/email'
import { downloadCsv } from '#/lib/csv'
// import { formatCurrency } from '#/lib/utils'

export const Route = createFileRoute('/dashboard/staff/')({
  beforeLoad: ({ context }) => {
    const userRole =
      (context.session.user as { role?: string }).role ?? 'student'
    if (userRole !== 'admin') {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: StaffListPage,
})

interface StaffRow {
  userId: string
  name: string
  email: string
  banned: boolean | null
  profileId: number | null
  staffName: string | null
  employeeNumber: string | null
  designation: string | null
  department: string | null
  phone: string | null
  photoUrl: string | null
  // defaultCheckIn: string | null
  // defaultCheckOut: string | null
  // basicPay: number | null
  // grossPay: number | null
  isActive: boolean | null
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

function StaffListPage() {
  const queryClient = useQueryClient()
  const [deleteTarget, setDeleteTarget] = useState<StaffRow | null>(null)

  const { data: staff = [] } = useQuery({
    queryKey: ['staff'],
    queryFn: () => listStaff() as Promise<StaffRow[]>,
  })

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['staff'] })

  const toggleMutation = useMutation({
    mutationFn: (vars: { userId: string; isActive: boolean }) =>
      toggleStaffActive({ data: vars }),
    onSuccess: (_, vars) => {
      toast.success(vars.isActive ? 'Staff activated' : 'Staff deactivated')
      invalidate()
    },
    onError: () => toast.error('Failed to update status'),
  })

  const deleteMutation = useMutation({
    mutationFn: (userId: string) => deleteStaff({ data: { userId } }),
    onSuccess: () => {
      toast.success('Staff deleted')
      invalidate()
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to delete'),
  })

  const departmentOptions = [
    { label: 'All', value: 'all' },
    { label: 'Teaching', value: 'teaching' },
    { label: 'Admin', value: 'admin' },
    { label: 'Support', value: 'support' },
  ]

  const columns: ColumnDef<StaffRow>[] = [
    {
      id: 'photo',
      header: '',
      enableSorting: false,
      cell: ({ row }) => {
        const s = row.original
        return (
          <Avatar className="size-8 rounded-md">
            <AvatarImage
              src={resolvePhotoUrl(s.photoUrl)}
              alt={s.name}
              className="object-cover"
            />
            <AvatarFallback className="rounded-md text-xs">
              {initialsFrom(s.name)}
            </AvatarFallback>
          </Avatar>
        )
      },
    },
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => {
        const s = row.original
        return (
          <div>
            <p className="font-medium">{s.name}</p>
            {s.employeeNumber && (
              <p className="text-xs text-muted-foreground">
                {s.employeeNumber}
              </p>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: 'email',
      header: 'Email',
      cell: ({ row }) => displayEmail(row.getValue('email') as string) || '-',
    },
    {
      accessorKey: 'designation',
      header: 'Designation',
      cell: ({ row }) => row.getValue('designation') ?? '-',
    },
    {
      accessorKey: 'department',
      header: 'Dept.',
      cell: ({ row }) => {
        const dept = row.getValue('department') as string | null
        if (!dept) return '-'
        const styles: Record<string, string> = {
          teaching:
            'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/40 dark:text-blue-200 dark:border-blue-800',
          admin:
            'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/40 dark:text-purple-200 dark:border-purple-800',
          support:
            'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/40 dark:text-amber-200 dark:border-amber-800',
        }
        return (
          <Badge
            variant="outline"
            className={`capitalize ${styles[dept] ?? ''}`}
          >
            {dept}
          </Badge>
        )
      },
      filterFn: (row, _id, value) => {
        if (!value || value === 'all') return true
        return row.getValue('department') === value
      },
    },
    {
      accessorKey: 'phone',
      header: 'Phone',
      cell: ({ row }) => {
        const phone = row.getValue('phone') as string | null
        return phone ? (
          <a
            href={`tel:${phone.replace(/\s+/g, '')}`}
            className="text-primary hover:underline"
          >
            {phone}
          </a>
        ) : (
          '-'
        )
      },
    },
    // {
    //   id: 'timings',
    //   header: 'Timings',
    //   enableSorting: false,
    //   cell: ({ row }) => {
    //     const s = row.original
    //     if (!s.defaultCheckIn && !s.defaultCheckOut) return '-'
    //     return (
    //       <span className="text-xs">
    //         {s.defaultCheckIn ?? '—'} → {s.defaultCheckOut ?? '—'}
    //       </span>
    //     )
    //   },
    // },
    // {
    //   accessorKey: 'basicPay',
    //   header: 'Basic Pay',
    //   cell: ({ row }) => {
    //     const v = row.getValue('basicPay') as number | null
    //     return v ? formatCurrency(v) : '-'
    //   },
    // },
    // {
    //   accessorKey: 'grossPay',
    //   header: 'Gross Pay',
    //   cell: ({ row }) => {
    //     const v = row.getValue('grossPay') as number | null
    //     return v ? formatCurrency(v) : '-'
    //   },
    // },
    {
      accessorKey: 'isActive',
      header: 'Status',
      cell: ({ row }) => {
        const s = row.original
        const active = s.isActive !== false
        const pending =
          toggleMutation.isPending &&
          toggleMutation.variables?.userId === s.userId
        return (
          <div className="flex items-center gap-2">
            <Switch
              checked={active}
              disabled={pending}
              onCheckedChange={(checked) =>
                toggleMutation.mutate({ userId: s.userId, isActive: checked })
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
        const s = row.original
        return (
          <div className="flex gap-1">
            <Link to="/dashboard/staff/$staffId" params={{ staffId: s.userId }}>
              <Button variant="ghost" size="xs" title="View / edit">
                <EyeIcon size={16} />
              </Button>
            </Link>
            <IconButton
              tooltip="Delete"
              icon={TrashIcon}
              className="text-destructive"
              size="xs"
              onClick={() => setDeleteTarget(s)}
            />
          </div>
        )
      },
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Staff</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() =>
              downloadCsv(
                staff,
                [
                  { key: 'name', label: 'Name' },
                  { key: 'email', label: 'Email' },
                  { key: 'employeeNumber', label: 'Emp #' },
                  { key: 'designation', label: 'Designation' },
                  { key: 'department', label: 'Department' },
                  { key: 'phone', label: 'Phone' },
                  { key: 'isActive', label: 'Active' },
                ],
                'staff-export',
              )
            }
            disabled={staff.length === 0}
          >
            Export CSV
          </Button>
          <Link to="/dashboard/staff/new">
            <Button>Add Staff</Button>
          </Link>
        </div>
      </div>

      <CustomDataTable
        tableId="staff"
        columns={columns}
        data={staff}
        filters={[
          { column: 'name', placeholder: 'Search name...', label: 'Name' },
          { column: 'email', placeholder: 'Search email...', label: 'Email' },
          {
            column: 'department',
            placeholder: 'Filter by department',
            label: 'Department',
            type: 'select',
            options: departmentOptions,
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

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete staff member</AlertDialogTitle>
            <AlertDialogDescription>
              Permanently delete{' '}
              <span className="font-medium text-foreground">
                {deleteTarget?.name}
              </span>
              ? This removes their account, profile, attendance records, and
              salary history. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (deleteTarget) {
                  deleteMutation.mutate(deleteTarget.userId)
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
