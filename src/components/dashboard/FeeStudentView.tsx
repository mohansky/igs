import type { ColumnDef } from '@tanstack/react-table'
import { Badge } from '#/components/ui/badge'
import { useQuery } from '@tanstack/react-query'
import { formatDate, formatCurrency } from '#/lib/utils'
import { getStudentFees } from '#/server/fees'
import { CustomDataTable } from './custom-data-table'

interface FeeRecord {
  id: number
  amount: number
  dueDate: string
  paidDate: string | null
  paidAmount: number | null
  status: string
  description: string | null
}

const statusBadgeVariant = (status: string) => {
  switch (status) {
    case 'paid':
      return 'default' as const
    case 'pending':
      return 'secondary' as const
    case 'partial':
      return 'outline' as const
    case 'overdue':
      return 'destructive' as const
    default:
      return 'outline' as const
  }
}

const columns: ColumnDef<FeeRecord>[] = [
  {
    accessorKey: 'description',
    header: 'Description',
    cell: ({ row }) => (
      <span className="font-medium">
        {row.getValue('description') ?? '-'}
      </span>
    ),
  },
  {
    accessorKey: 'amount',
    header: 'Amount',
    cell: ({ row }) => formatCurrency(row.getValue('amount') as number),
  },
  {
    accessorKey: 'dueDate',
    header: 'Due Date',
    cell: ({ row }) => formatDate(row.getValue('dueDate')),
  },
  {
    accessorKey: 'paidAmount',
    header: 'Paid',
    cell: ({ row }) =>
      formatCurrency(row.getValue('paidAmount') as number | null),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.getValue('status') as string
      return <Badge variant={statusBadgeVariant(status)}>{status}</Badge>
    },
  },
]

export function FeeStudentView({
  userId,
  studentProfileId,
}: {
  userId?: string
  studentProfileId?: number
}) {
  const { data: fees = [], isLoading } = useQuery({
    queryKey: ['fees', 'student', studentProfileId ?? userId],
    queryFn: () =>
      getStudentFees({
        data: studentProfileId
          ? { studentProfileId }
          : { studentUserId: userId },
      }) as Promise<FeeRecord[]>,
  })

  const totalDue = fees.reduce((sum, f) => sum + f.amount, 0)
  const totalPaid = fees.reduce((sum, f) => sum + (f.paidAmount ?? 0), 0)

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading...</p>
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Badge variant="outline">Total Due: {formatCurrency(totalDue)}</Badge>
        <Badge variant="default">Total Paid: {formatCurrency(totalPaid)}</Badge>
        <Badge variant={totalDue - totalPaid > 0 ? 'destructive' : 'default'}>
          Balance: {formatCurrency(totalDue - totalPaid)}
        </Badge>
      </div>

      <CustomDataTable
        columns={columns}
        data={fees}
        showDatePicker
        dateField="dueDate"
      />
    </div>
  )
}
