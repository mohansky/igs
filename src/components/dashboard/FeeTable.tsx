import { useMemo, useState } from 'react'
import TrashIcon from '#/components/icons/TrashIcon'
import EditIcon from '#/components/icons/EditIcon'
import EyeIcon from '#/components/icons/EyeIcon'
import { IconButton } from '#/components/dashboard/IconButton'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
// import { ArrowUpDownIcon } from 'lucide-react'
import { cn, formatDate, formatCurrency } from '#/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { CustomDataTable } from './CustomDataTable'
import { FeePaymentsDialog } from './FeePaymentsDialog'
import { Label } from '#/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'

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
  razorpayOrderId: string | null
  razorpayPaymentId: string | null
  description: string | null
  notes: string | null
  studentName: string | null
  admissionNumber: string | null
  classId: number | null
  className: string | null
  classSection: string | null
  isOverdue: boolean
  receivedByUserId: string | null
  receivedByName: string | null
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

function monthKeyFromIsoDate(date: string | null | undefined): string | null {
  if (!date) return null
  const match = /^(\d{4})-(\d{2})/.exec(date)
  return match ? `${match[1]}-${match[2]}` : null
}

function monthLabel(key: string): string {
  const [year, month] = key.split('-')
  return `${MONTH_NAMES[Number(month) - 1]} ${year}`
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
  onBulkPay,
  onBulkDelete,
}: {
  fees: FeeRecord[]
  onRecordPayment: (fee: FeeRecord) => void
  onEditFee: (fee: FeeRecord) => void
  onDeleteFee: (fee: FeeRecord) => void
  onBulkPay?: (ids: number[], paymentMethod: string, paidDate: string) => void
  onBulkDelete?: (ids: number[]) => void
}) {
  const [deleteTarget, setDeleteTarget] = useState<FeeRecord | null>(null)
  const [paymentsTarget, setPaymentsTarget] = useState<FeeRecord | null>(null)
  const [selectedDueMonth, setSelectedDueMonth] = useState<string>('all')
  const [selectedPaidMonth, setSelectedPaidMonth] = useState<string>('all')
  const [filteredRows, setFilteredRows] = useState<FeeRecord[]>([])
  const [selected, setSelected] = useState<FeeRecord[]>([])
  const [payOpen, setPayOpen] = useState(false)
  const [payMethod, setPayMethod] = useState('cash')
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10))
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)

  const unpaidSelected = selected.filter((f) => f.status !== 'paid')

  const dueMonthOptions = useMemo(() => {
    const keys = new Set<string>()
    for (const f of fees) {
      const k = monthKeyFromIsoDate(f.dueDate)
      if (k) keys.add(k)
    }
    return [
      { label: 'All months', value: 'all' },
      ...Array.from(keys)
        .sort((a, b) => b.localeCompare(a))
        .map((k) => ({ label: monthLabel(k), value: k })),
    ]
  }, [fees])

  const paidMonthOptions = useMemo(() => {
    const keys = new Set<string>()
    for (const f of fees) {
      const k = monthKeyFromIsoDate(f.paidDate)
      if (k) keys.add(k)
    }
    return [
      { label: 'All months', value: 'all' },
      ...Array.from(keys)
        .sort((a, b) => b.localeCompare(a))
        .map((k) => ({ label: monthLabel(k), value: k })),
    ]
  }, [fees])

  const studentOptions = useMemo(() => {
    const names = new Set<string>()
    for (const f of fees) if (f.studentName) names.add(f.studentName)
    return [
      { label: 'All students', value: 'all' },
      ...Array.from(names)
        .sort((a, b) => a.localeCompare(b))
        .map((name) => ({ label: name, value: name })),
    ]
  }, [fees])

  const formatClassLabel = (
    name: string | null,
    section: string | null,
  ): string | null => {
    if (!name) return null
    return section ? `${name} - ${section}` : name
  }

  const classOptions = useMemo(() => {
    const labels = new Set<string>()
    for (const f of fees) {
      const label = formatClassLabel(f.className, f.classSection)
      if (label) labels.add(label)
    }
    return [
      { label: 'All classes', value: 'all' },
      ...Array.from(labels)
        .sort((a, b) => a.localeCompare(b))
        .map((label) => ({ label, value: label })),
    ]
  }, [fees])

  const filteredFees = useMemo(() => {
    return fees.filter((f) => {
      if (
        selectedDueMonth !== 'all' &&
        monthKeyFromIsoDate(f.dueDate) !== selectedDueMonth
      )
        return false
      if (
        selectedPaidMonth !== 'all' &&
        monthKeyFromIsoDate(f.paidDate) !== selectedPaidMonth
      )
        return false
      return true
    })
  }, [fees, selectedDueMonth, selectedPaidMonth])

  const summary = useMemo(() => {
    const totalDue = filteredRows.reduce((s, f) => s + f.amount, 0)
    const totalCollected = filteredRows.reduce(
      (s, f) => s + (f.paidAmount ?? 0),
      0,
    )
    const outstanding = totalDue - totalCollected
    const overdueCount = filteredRows.filter(
      (f) => f.isOverdue && f.status !== 'paid',
    ).length
    return {
      count: filteredRows.length,
      totalDue,
      totalCollected,
      outstanding,
      overdueCount,
    }
  }, [filteredRows])

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
          {/* <ArrowUpDownIcon className="ml-1 size-3.5" /> */}
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
          {/* <ArrowUpDownIcon className="ml-1 size-3.5" /> */}
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
                className="flex flex-col hover:underline"
              >
                <span className="font-medium text-primary hover:underline">
                  {name}
                </span>
                {admNo && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    ({admNo})
                  </span>
                )}
              </Link>
            ) : (
              <span className="font-medium">{name}</span>
            )}
            {/* {admNo && (
              <span className="ml-2 text-xs text-muted-foreground">
                ({admNo})
              </span>
            )} */}
          </div>
        )
      },
      filterFn: (row, _id, value) => {
        if (!value || value === 'all') return true
        return row.getValue('studentName') === value
      },
    },
    {
      id: 'class',
      accessorFn: (row) => formatClassLabel(row.className, row.classSection),
      header: 'Class',
      cell: ({ row }) => {
        const label = formatClassLabel(
          row.original.className,
          row.original.classSection,
        )
        return label ?? '-'
      },
      filterFn: (row, _id, value) => {
        if (!value || value === 'all') return true
        return row.getValue('class') === value
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
        const fee = row.original
        return (
          <div className="flex flex-col flex-wrap items-center gap-1">
            <Badge
              className="capitalize"
              variant={statusBadgeVariant(fee.status)}
            >
              {fee.status}
            </Badge>
            {fee.isOverdue && fee.status !== 'paid' && (
              <Badge variant="destructive">Overdue</Badge>
            )}
          </div>
        )
      },
      filterFn: (row, _id, value) => {
        if (!value || value === 'all') return true
        if (value === 'overdue') {
          return row.original.isOverdue && row.original.status !== 'paid'
        }
        return row.getValue('status') === value
      },
    },
    {
      id: 'pay',
      header: 'Pay',
      cell: ({ row }) => {
        const fee = row.original
        return (
          <div>
            {fee.status !== 'paid' && (
              <Button size="xs" onClick={() => onRecordPayment(fee)}>
                Pay
              </Button>
            )}
          </div>
        )
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const fee = row.original
        const hasPayments = (fee.paidAmount ?? 0) > 0
        return (
          <div className="flex gap-1">
            {hasPayments && (
              <IconButton
                tooltip="View payment history"
                icon={EyeIcon}
                size="xs"
                onClick={() => setPaymentsTarget(fee)}
              />
            )}
            <IconButton
              tooltip="Edit"
              icon={EditIcon}
              className="text-primary"
              size="xs"
              onClick={() => onEditFee(fee)}
            />
            <IconButton
              tooltip="Delete"
              icon={TrashIcon}
              className="text-destructive"
              size="xs"
              onClick={() => setDeleteTarget(fee)}
            />
          </div>
        )
      },
    },
  ]

  const monthFilterExtras = (
    <>
      <div className="flex flex-col gap-1">
        <Label htmlFor="fee-due-month-filter">Due date month</Label>
        <Select value={selectedDueMonth} onValueChange={setSelectedDueMonth}>
          <SelectTrigger id="fee-due-month-filter" className="w-52">
            <SelectValue placeholder="All months" />
          </SelectTrigger>
          <SelectContent>
            {dueMonthOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="fee-paid-month-filter">Paid date month</Label>
        <Select value={selectedPaidMonth} onValueChange={setSelectedPaidMonth}>
          <SelectTrigger id="fee-paid-month-filter" className="w-52">
            <SelectValue placeholder="All months" />
          </SelectTrigger>
          <SelectContent>
            {paidMonthOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </>
  )

  return (
    <>
      <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Fees
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {formatCurrency(summary.totalDue)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {summary.count} record{summary.count === 1 ? '' : 's'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Collected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(summary.totalCollected)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Outstanding
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={cn(
                'text-2xl font-bold',
                summary.outstanding > 0 ? 'text-amber-600' : 'text-green-600',
              )}
            >
              {formatCurrency(summary.outstanding)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Overdue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={cn(
                'text-2xl font-bold',
                summary.overdueCount > 0
                  ? 'text-red-600'
                  : 'text-muted-foreground',
              )}
            >
              {summary.overdueCount}
            </p>
          </CardContent>
        </Card>
      </div>

      {(onBulkPay || onBulkDelete) && selected.length > 0 && (
        <div className="sticky top-2 z-20 mb-2 flex flex-wrap items-center gap-2 rounded-lg border bg-background/95 px-3 py-2 shadow-sm backdrop-blur">
          <span className="text-sm font-medium">
            {selected.length} selected
          </span>
          <div className="ml-auto flex flex-wrap gap-2">
            {onBulkPay && (
              <Button
                size="sm"
                variant="outline"
                disabled={unpaidSelected.length === 0}
                onClick={() => {
                  setPayMethod('cash')
                  setPayDate(new Date().toISOString().slice(0, 10))
                  setPayOpen(true)
                }}
              >
                Mark as paid ({unpaidSelected.length})
              </Button>
            )}
            {onBulkDelete && (
              <Button
                size="sm"
                variant="outline"
                className="text-destructive"
                onClick={() => setBulkDeleteOpen(true)}
              >
                Delete
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => setSelected([])}>
              Clear
            </Button>
          </div>
        </div>
      )}

      <CustomDataTable
        tableId="fees"
        columns={columns}
        data={filteredFees}
        enableSelection={Boolean(onBulkPay || onBulkDelete)}
        onSelectionChange={setSelected}
        onFilteredRowsChange={setFilteredRows}
        showDatePicker
        dateField="dueDate"
        datePickerExtras={monthFilterExtras}
        filters={[
          {
            column: 'studentName',
            placeholder: 'Select student...',
            label: 'Student',
            type: 'combobox',
            options: studentOptions,
            emptyText: 'No students found.',
          },
          {
            column: 'class',
            placeholder: 'Filter by class',
            label: 'Class',
            type: 'select',
            options: classOptions,
          },
          {
            column: 'description',
            placeholder: 'Search description...',
            label: 'Description',
          },
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

      <FeePaymentsDialog
        fee={paymentsTarget}
        open={!!paymentsTarget}
        onOpenChange={(open) => {
          if (!open) setPaymentsTarget(null)
        }}
      />

      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Mark fees as paid</DialogTitle>
            <DialogDescription>
              {unpaidSelected.length} unpaid fee(s) will be marked paid in full
              as of the date below.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label htmlFor="bulk-pay-date">Paid date</Label>
              <Input
                id="bulk-pay-date"
                type="date"
                value={payDate}
                onChange={(e) => setPayDate(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="bulk-pay-method">Payment method</Label>
              <Select value={payMethod} onValueChange={setPayMethod}>
                <SelectTrigger id="bulk-pay-method" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="bank">Bank transfer</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={unpaidSelected.length === 0 || !payDate}
              onClick={() => {
                onBulkPay?.(
                  unpaidSelected.map((f) => f.id),
                  payMethod,
                  payDate,
                )
                setPayOpen(false)
                setSelected([])
              }}
            >
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete fee records</AlertDialogTitle>
            <AlertDialogDescription>
              Permanently delete {selected.length} fee record(s)? This cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                onBulkDelete?.(selected.map((f) => f.id))
                setBulkDeleteOpen(false)
                setSelected([])
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
                  const id = deleteTarget.id
                  onDeleteFee(deleteTarget)
                  setSelected((prev) => prev.filter((f) => f.id !== id))
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
