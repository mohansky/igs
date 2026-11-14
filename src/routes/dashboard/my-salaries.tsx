import { createFileRoute, Link } from '@tanstack/react-router'
import { requireRouteRole } from '#/lib/route-guards'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { format, parseISO } from 'date-fns'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { StatCard, StatCardSkeleton } from '#/components/dashboard/StatCard'
import { Skeleton } from '#/components/ui/skeleton'
import { CustomDataTable } from '#/components/dashboard/CustomDataTable'
import { getStaffSalaryHistory } from '#/server/staff'
import { formatCurrency, formatDate } from '#/lib/utils'

export const Route = createFileRoute('/dashboard/my-salaries')({
  beforeLoad: ({ context }) => {
    requireRouteRole(context, ['staff', 'admin'], { allowAuditor: false })
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

  // The cards total the rows the table's filters leave visible.
  const [visibleRows, setVisibleRows] = useState<SalaryRow[] | null>(null)
  const summaryRows = visibleRows ?? salaries
  const totalNet = summaryRows.reduce((sum, r) => sum + r.netPay, 0)
  const totalPaid = summaryRows
    .filter((r) => r.status === 'paid')
    .reduce((sum, r) => sum + r.netPay, 0)
  const totalPending = summaryRows
    .filter((r) => r.status === 'pending')
    .reduce((sum, r) => sum + r.netPay, 0)

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
        <div className="grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">My Salaries</h1>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Total"
          value={formatCurrency(totalNet)}
          note={`${summaryRows.length} record${summaryRows.length === 1 ? '' : 's'}`}
        />
        <StatCard
          label="Paid"
          value={formatCurrency(totalPaid)}
          valueClassName="text-green-600"
        />
        <StatCard
          label="Pending"
          value={formatCurrency(totalPending)}
          valueClassName={
            totalPending > 0 ? 'text-amber-600' : 'text-muted-foreground'
          }
        />
      </div>

      {salaries.length === 0 ? (
        <p className="text-sm text-muted-foreground">No salary records yet.</p>
      ) : (
        <CustomDataTable
          tableId="my-salaries"
          columns={columns}
          data={salaries}
          onFilteredRowsChange={setVisibleRows}
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
