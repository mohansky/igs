import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { format, parseISO } from 'date-fns'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Skeleton } from '#/components/ui/skeleton'
import { CustomDataTable } from '#/components/dashboard/CustomDataTable'
import { getStaffSalaryHistory } from '#/server/staff'
import { formatCurrency, formatDate } from '#/lib/utils'

export const Route = createFileRoute('/dashboard/my-salaries')({
  beforeLoad: ({ context }) => {
    const userRole =
      (context.session.user as { role?: string }).role ?? 'student'
    if (userRole !== 'staff' && userRole !== 'admin') {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: MySalariesPage,
})

interface SalaryRow {
  id: number
  userId: string
  staffName: string
  designation: string | null
  month: string
  basicPay: number
  allowances: number | null
  deductions: number | null
  netPay: number
  paidDate: string | null
  paymentMethod: string | null
  status: string
  notes: string | null
}

function MySalariesPage() {
  const { session } = Route.useRouteContext()
  const userId = session.user.id

  const { data: salaries = [], isLoading } = useQuery({
    queryKey: ['my-salaries', userId],
    queryFn: () =>
      getStaffSalaryHistory({ data: { userId } }) as Promise<SalaryRow[]>,
  })

  const totalPaid = salaries
    .filter((s) => s.status === 'paid')
    .reduce((sum, s) => sum + s.netPay, 0)
  const totalPending = salaries
    .filter((s) => s.status === 'pending')
    .reduce((sum, s) => sum + s.netPay, 0)

  const columns: ColumnDef<SalaryRow>[] = [
    {
      accessorKey: 'month',
      header: 'Month',
      cell: ({ row }) => {
        const m = row.getValue('month') as string
        try {
          return format(parseISO(m + '-01'), 'MMM yyyy')
        } catch {
          return m
        }
      },
    },
    {
      accessorKey: 'basicPay',
      header: 'Basic Pay',
      cell: ({ row }) => formatCurrency(row.getValue('basicPay') as number),
    },
    {
      accessorKey: 'allowances',
      header: 'Allowances',
      cell: ({ row }) =>
        formatCurrency((row.getValue('allowances') as number | null) ?? 0),
    },
    {
      accessorKey: 'deductions',
      header: 'Deductions',
      cell: ({ row }) =>
        formatCurrency((row.getValue('deductions') as number | null) ?? 0),
    },
    {
      accessorKey: 'netPay',
      header: 'Net Pay',
      cell: ({ row }) => (
        <span className="font-semibold">
          {formatCurrency(row.getValue('netPay') as number)}
        </span>
      ),
    },
    {
      accessorKey: 'paidDate',
      header: 'Paid Date',
      cell: ({ row }) => {
        const d = row.getValue('paidDate') as string | null
        return d ? formatDate(d) : '-'
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.getValue('status') as string
        return (
          <Badge
            className="capitalize"
            variant={status === 'paid' ? 'default' : 'warning'}
          >
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
      id: 'slip',
      header: 'Slip',
      enableSorting: false,
      cell: ({ row }) => {
        const s = row.original
        if (s.status !== 'paid') return null
        return (
          <Link
            to="/dashboard/staff/$staffId/slip/$salaryId"
            params={{ staffId: userId, salaryId: String(s.id) }}
          >
            <Button size="xs" variant="outline">
              View Slip
            </Button>
          </Link>
        )
      },
    },
  ]

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">My Salaries</h1>
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-7 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">My Salaries</h1>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Paid
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(totalPaid)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={
                totalPending > 0
                  ? 'text-2xl font-bold text-amber-600'
                  : 'text-2xl font-bold text-muted-foreground'
              }
            >
              {formatCurrency(totalPending)}
            </p>
          </CardContent>
        </Card>
      </div>

      {salaries.length === 0 ? (
        <p className="text-sm text-muted-foreground">No salary records yet.</p>
      ) : (
        <CustomDataTable
          tableId="my-salaries"
          columns={columns}
          data={salaries}
          filters={[
            {
              column: 'status',
              placeholder: 'Filter by status',
              label: 'Status',
              type: 'select',
              options: [
                { label: 'All', value: 'all' },
                { label: 'Paid', value: 'paid' },
                { label: 'Pending', value: 'pending' },
              ],
            },
          ]}
        />
      )}
    </div>
  )
}
