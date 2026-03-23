import { useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Link } from '@tanstack/react-router'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
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
import { ArrowUpDownIcon } from 'lucide-react'
import { formatDate, formatCurrency } from '#/lib/utils'
import { CustomDataTable } from './custom-data-table'

interface FeeRecord {
  id: number
  studentUserId: string
  studentProfileId: number | null
  amount: number
  dueDate: string
  paidDate: string | null
  paidAmount: number | null
  status: string
  paymentMethod: string | null
  receiptNumber: string | null
  description: string | null
  notes: string | null
  studentName: string | null
  admissionNumber: string | null
}

const statusBadgeVariant = (status: string) => {
  switch (status) {
    case 'paid':
      return 'success' as const
    case 'pending':
      return 'warning' as const
    case 'partial':
      return 'default' as const
    case 'overdue':
      return 'destructive' as const
    default:
      return 'outline' as const
  }
}

export function FeeTable({
  fees,
  onRecordPayment,
  onEditFee,
  onDeleteFee,
}: {
  fees: FeeRecord[]
  onRecordPayment: (fee: FeeRecord) => void
  onEditFee: (fee: FeeRecord) => void
  onDeleteFee: (fee: FeeRecord) => void
}) {
  const [deleteTarget, setDeleteTarget] = useState<FeeRecord | null>(null)

  const columns: ColumnDef<FeeRecord>[] = [
    {
      accessorKey: 'dueDate',
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Due Date
          <ArrowUpDownIcon className="ml-1 size-3.5" />
        </Button>
      ),
      cell: ({ row }) => formatDate(row.getValue('dueDate')),
      sortingFn: 'alphanumeric',
    },
    {
      accessorKey: 'paidDate',
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Paid Date
          <ArrowUpDownIcon className="ml-1 size-3.5" />
        </Button>
      ),
      cell: ({ row }) => formatDate(row.getValue('paidDate')),
      sortingFn: 'alphanumeric',
    },
    {
      accessorKey: 'studentName',
      header: 'Student',
      cell: ({ row }) => {
        const name = row.getValue('studentName') as string | null
        const admNo = row.original.admissionNumber
        const profileId = row.original.studentProfileId
        if (!name) return '-'
        return (
          <div>
            {profileId ? (
              <Link
                to="/dashboard/students/$studentId"
                params={{ studentId: String(profileId) }}
                className="font-medium text-primary hover:underline"
              >
                {name}
              </Link>
            ) : (
              <span className="font-medium">{name}</span>
            )}
            {admNo && (
              <span className="ml-2 text-xs text-muted-foreground">
                ({admNo})
              </span>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: ({ row }) => row.getValue('description') ?? '-',
    },
    {
      accessorKey: 'amount',
      header: 'Amount due',
      cell: ({ row }) => formatCurrency(row.getValue('amount') as number),
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
        return (
          <Badge className="capitalize" variant={statusBadgeVariant(status)}>
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
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const fee = row.original
        return (
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="xs"
              onClick={() => onEditFee(fee)}
            >
              Edit
            </Button>
            {fee.status !== 'paid' && (
              <Button size="xs" onClick={() => onRecordPayment(fee)}>
                Pay
              </Button>
            )}
            <Button
              variant="destructive"
              size="xs"
              onClick={() => setDeleteTarget(fee)}
            >
              Delete
            </Button>
          </div>
        )
      },
    },
  ]

  return (
    <>
      <CustomDataTable
        columns={columns}
        data={fees}
        showDatePicker
        dateField="dueDate"
        filters={[
          { column: 'studentName', placeholder: 'Search student...', label: 'Student' },
          { column: 'description', placeholder: 'Search description...', label: 'Description' },
          {
            column: 'status',
            placeholder: 'Filter by status',
            type: 'select',
            options: [
              { label: 'All', value: 'all' },
              { label: 'Paid', value: 'paid' },
              { label: 'Pending', value: 'pending' },
              { label: 'Partial', value: 'partial' },
              { label: 'Overdue', value: 'overdue' },
            ],
            label: 'Status',
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
            <AlertDialogTitle>Delete Fee Record</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{' '}
              <span className="font-medium text-foreground">
                {deleteTarget?.description ?? 'this fee record'}
              </span>
              {deleteTarget?.studentName && (
                <>
                  {' '}
                  for{' '}
                  <span className="font-medium text-foreground">
                    {deleteTarget.studentName}
                  </span>
                </>
              )}
              ? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (deleteTarget) {
                  onDeleteFee(deleteTarget)
                  setDeleteTarget(null)
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
