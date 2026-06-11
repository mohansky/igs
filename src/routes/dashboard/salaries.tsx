import { createFileRoute, redirect } from '@tanstack/react-router'
import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { format, parseISO } from 'date-fns'
import type { ColumnDef } from '@tanstack/react-table'
import { Calendar03Icon } from 'hugeicons-react'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Badge } from '#/components/ui/badge'
import { Calendar } from '#/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '#/components/ui/popover'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { CustomDataTable } from '#/components/dashboard/CustomDataTable'
import { ConfirmDialog } from '#/components/dashboard/ConfirmDialog'
import { Skeleton } from '#/components/ui/skeleton'
import { cn, formatCurrency, formatDate } from '#/lib/utils'
import {
  listSalaries,
  listStaffForSalary,
  createSalary,
  updateSalary,
  deleteSalary,
  markSalaryPaid,
  bulkMarkSalariesPaid,
  bulkDeleteSalaries,
} from '#/server/salaries'
import { generatePayroll } from '#/server/staff'
import { downloadCsv } from '#/lib/csv'
import TrashIcon from '#/components/icons/TrashIcon'
import EditIcon from '#/components/icons/EditIcon'
import AddIcon from '#/components/icons/AddIcon'
import DownloadIcon from '#/components/icons/DownloadIcon'
import { IconButton } from '#/components/dashboard/IconButton'

export const Route = createFileRoute('/dashboard/salaries')({
  beforeLoad: ({ context }) => {
    const userRole =
      (context.session.user as { role?: string }).role ?? 'student'
    if (userRole !== 'admin') {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: SalariesPage,
})

interface SalaryRecord {
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

interface StaffMember {
  id: string
  name: string
  email: string
}

const paymentMethods = ['Cash', 'Bank Transfer', 'Cheque', 'UPI', 'Card']

function SalariesPage() {
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<SalaryRecord | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [payDialog, setPayDialog] = useState<SalaryRecord | null>(null)

  // Form state
  const [staffUserId, setStaffUserId] = useState('')
  const [designation, setDesignation] = useState('')
  const [month, setMonth] = useState(format(new Date(), 'yyyy-MM'))
  const [basicPay, setBasicPay] = useState('')
  const [allowances, setAllowances] = useState('')
  const [deductions, setDeductions] = useState('')
  const [notes, setNotes] = useState('')

  // Pay dialog state
  const [payMethod, setPayMethod] = useState('')
  const [payDate, setPayDate] = useState(format(new Date(), 'yyyy-MM-dd'))

  // Bulk actions state
  const [selected, setSelected] = useState<SalaryRecord[]>([])
  const [bulkPayOpen, setBulkPayOpen] = useState(false)
  const [bulkPayMethod, setBulkPayMethod] = useState('Cash')
  const [bulkPayDate, setBulkPayDate] = useState(
    format(new Date(), 'yyyy-MM-dd'),
  )
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)

  const { data: salaries = [], isLoading } = useQuery({
    queryKey: ['salaries'],
    queryFn: () => listSalaries() as Promise<SalaryRecord[]>,
  })

  const staffNameOptions = useMemo(() => {
    const names = new Set<string>()
    for (const s of salaries) {
      if (s.staffName) names.add(s.staffName)
    }
    return [
      { label: 'All staff', value: 'all' },
      ...Array.from(names)
        .sort()
        .map((n) => ({ label: n, value: n })),
    ]
  }, [salaries])

  const monthFilterOptions = useMemo(() => {
    const keys = new Set<string>()
    for (const s of salaries) if (s.month) keys.add(s.month)
    return [
      { label: 'All months', value: 'all' },
      ...Array.from(keys)
        .sort((a, b) => b.localeCompare(a))
        .map((key) => {
          let label = key
          try {
            label = format(parseISO(key + '-01'), 'MMM yyyy')
          } catch {
            /* fall through */
          }
          return { label, value: key }
        }),
    ]
  }, [salaries])

  const { data: staffMembers = [] } = useQuery({
    queryKey: ['staff-for-salary'],
    queryFn: () => listStaffForSalary() as Promise<StaffMember[]>,
  })

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['salaries'] })

  const netPay = useMemo(() => {
    const b = Number(basicPay) || 0
    const a = Number(allowances) || 0
    const d = Number(deductions) || 0
    return b + a - d
  }, [basicPay, allowances, deductions])

  const saveMutation = useMutation({
    mutationFn: async () => {
      const staff = staffMembers.find((s) => s.id === staffUserId)
      if (editing) {
        await updateSalary({
          data: {
            id: editing.id,
            updates: {
              basicPay: Number(basicPay),
              allowances: Number(allowances) || 0,
              deductions: Number(deductions) || 0,
              netPay,
              designation: designation || undefined,
              notes: notes || undefined,
            },
          },
        })
      } else {
        await createSalary({
          data: {
            userId: staffUserId,
            staffName: staff?.name ?? '',
            designation: designation || undefined,
            month,
            basicPay: Number(basicPay),
            allowances: Number(allowances) || 0,
            deductions: Number(deductions) || 0,
            netPay,
            notes: notes || undefined,
          },
        })
      }
    },
    onSuccess: () => {
      setDialogOpen(false)
      invalidate()
      toast.success(editing ? 'Salary updated' : 'Salary record created')
    },
    onError: () => toast.error('Failed to save salary record'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteSalary({ data: { id } }),
    onSuccess: (_, id) => {
      setSelected((prev) => prev.filter((s) => s.id !== id))
      invalidate()
      toast.success('Salary record deleted')
    },
    onError: () => toast.error('Failed to delete'),
  })

  const payMutation = useMutation({
    mutationFn: () =>
      markSalaryPaid({
        data: {
          id: payDialog!.id,
          paymentMethod: payMethod,
          paidDate: payDate,
        },
      }),
    onSuccess: () => {
      setPayDialog(null)
      invalidate()
      toast.success('Salary marked as paid')
    },
    onError: () => toast.error('Failed to mark as paid'),
  })

  const bulkPayMutation = useMutation({
    mutationFn: (vars: {
      salaryIds: number[]
      paymentMethod: string
      paidDate: string
    }) => bulkMarkSalariesPaid({ data: vars }),
    onSuccess: (res) => {
      setBulkPayOpen(false)
      setSelected([])
      invalidate()
      toast.success(`Marked ${res.updated} salary(ies) as paid`)
    },
    onError: () => toast.error('Failed to mark salaries as paid'),
  })

  const bulkDeleteMutation = useMutation({
    mutationFn: (salaryIds: number[]) =>
      bulkDeleteSalaries({ data: { salaryIds } }),
    onSuccess: (res) => {
      setBulkDeleteOpen(false)
      setSelected([])
      invalidate()
      toast.success(`Deleted ${res.deleted} salary record(s)`)
    },
    onError: () => toast.error('Failed to delete salary records'),
  })

  const unpaidSelected = selected.filter((s) => s.status === 'pending')

  const [payrollMonth, setPayrollMonth] = useState(
    format(new Date(), 'yyyy-MM'),
  )
  const payrollMutation = useMutation({
    mutationFn: (month: string) => generatePayroll({ data: { month } }),
    onSuccess: (res) => {
      invalidate()
      if (res.created > 0) {
        toast.success(
          `Generated ${res.created} new record${res.created === 1 ? '' : 's'}${
            res.skipped > 0 ? `, skipped ${res.skipped} existing` : ''
          }`,
        )
      } else {
        toast.info(
          `No new records — ${res.skipped} staff already have salaries for this month`,
        )
      }
    },
    onError: () => toast.error('Failed to generate payroll'),
  })

  const resetForm = () => {
    setStaffUserId('')
    setDesignation('')
    setMonth(format(new Date(), 'yyyy-MM'))
    setBasicPay('')
    setAllowances('')
    setDeductions('')
    setNotes('')
  }

  const openCreate = () => {
    setEditing(null)
    resetForm()
    setDialogOpen(true)
  }

  const openEdit = (record: SalaryRecord) => {
    setEditing(record)
    setStaffUserId(record.userId)
    setDesignation(record.designation ?? '')
    setMonth(record.month)
    setBasicPay(record.basicPay.toString())
    setAllowances((record.allowances ?? 0).toString())
    setDeductions((record.deductions ?? 0).toString())
    setNotes(record.notes ?? '')
    setDialogOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    saveMutation.mutate()
  }

  // Summary
  const totalNet = salaries.reduce((sum, s) => sum + s.netPay, 0)
  const totalPaid = salaries
    .filter((s) => s.status === 'paid')
    .reduce((sum, s) => sum + s.netPay, 0)
  const totalPending = salaries
    .filter((s) => s.status === 'pending')
    .reduce((sum, s) => sum + s.netPay, 0)

  const columns: ColumnDef<SalaryRecord>[] = [
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
      filterFn: (row, _id, value) => {
        if (!value || value === 'all') return true
        return row.getValue('month') === value
      },
    },
    {
      accessorKey: 'staffName',
      header: 'Staff Name',
      cell: ({ row }) => (
        <span className="font-medium">{row.getValue('staffName')}</span>
      ),
      filterFn: (row, _id, value) => {
        if (!value || value === 'all') return true
        return row.getValue('staffName') === value
      },
    },
    {
      accessorKey: 'designation',
      header: 'Designation',
      cell: ({ row }) => row.getValue('designation') ?? '-',
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
      id: 'pay',
      header: 'Pay',
      cell: ({ row }) => {
        const record = row.original
        return (
          <div className="flex gap-2">
            {record.status === 'pending' && (
              <Button
                size="xs"
                onClick={() => {
                  setPayDialog(record)
                  setPayMethod('')
                  setPayDate(format(new Date(), 'yyyy-MM-dd'))
                }}
              >
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
        const record = row.original
        return (
          <div className="flex gap-2">
            <IconButton
              tooltip="Edit"
              icon={EditIcon}
              className="text-primary"
              onClick={() => openEdit(record)}
            />
            <IconButton
              tooltip="Delete"
              icon={TrashIcon}
              className="text-destructive"
              onClick={() => setDeleteId(record.id)}
            />
          </div>
        )
      },
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Staff Salaries</h1>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-md border px-2 py-1">
            <Label className="text-xs text-muted-foreground">
              Generate for
            </Label>
            <Input
              type="month"
              value={payrollMonth}
              onChange={(e) => setPayrollMonth(e.target.value)}
              className="h-7 w-36 border-0 shadow-none focus-visible:ring-0"
            />
            <Button
              size="sm"
              variant="secondary"
              onClick={() => payrollMutation.mutate(payrollMonth)}
              disabled={payrollMutation.isPending || !payrollMonth}
            >
              {payrollMutation.isPending ? 'Generating...' : 'Run Payroll'}
            </Button>
          </div>
          <Button
            variant="outline"
            onClick={() =>
              downloadCsv(
                salaries,
                [
                  { key: 'month', label: 'Month' },
                  { key: 'staffName', label: 'Staff Name' },
                  { key: 'designation', label: 'Designation' },
                  { key: 'basicPay', label: 'Basic Pay' },
                  { key: 'allowances', label: 'Allowances' },
                  { key: 'deductions', label: 'Deductions' },
                  { key: 'netPay', label: 'Net Pay' },
                  { key: 'status', label: 'Status' },
                  { key: 'paidDate', label: 'Paid Date' },
                  { key: 'paymentMethod', label: 'Payment Method' },
                ],
                'salaries-export',
              )
            }
            disabled={salaries.length === 0}
          >
            <DownloadIcon className="h-4 w-4" />
            Export CSV
          </Button>
          <Button onClick={openCreate}>
            <AddIcon className="h-4 w-4" /> Add Salary
          </Button>
        </div>
      </div>

      {isLoading ? (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-7 w-28" />
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardContent className="p-0">
              <div className="flex gap-2 border-b p-4">
                <Skeleton className="h-9 w-48" />
              </div>
              <div className="divide-y">
                {Array.from({ length: 6 }).map((_, r) => (
                  <div key={r} className="flex items-center gap-4 px-4 py-3">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Salaries
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatCurrency(totalNet)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Paid
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
                  className={cn(
                    'text-2xl font-bold',
                    totalPending > 0 ? 'text-amber-600' : 'text-green-600',
                  )}
                >
                  {formatCurrency(totalPending)}
                </p>
              </CardContent>
            </Card>
          </div>

          {selected.length > 0 && (
            <div className="sticky top-2 z-20 flex flex-wrap items-center gap-2 rounded-lg border bg-background/95 px-3 py-2 shadow-sm backdrop-blur">
              <span className="text-sm font-medium">
                {selected.length} selected
              </span>
              <div className="ml-auto flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={unpaidSelected.length === 0}
                  onClick={() => {
                    setBulkPayMethod('Cash')
                    setBulkPayDate(format(new Date(), 'yyyy-MM-dd'))
                    setBulkPayOpen(true)
                  }}
                >
                  Mark as paid ({unpaidSelected.length})
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive"
                  onClick={() => setBulkDeleteOpen(true)}
                >
                  Delete
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
            tableId="salaries"
            columns={columns}
            data={salaries}
            enableSelection
            onSelectionChange={setSelected}
            filters={[
              {
                column: 'month',
                placeholder: 'Filter by month',
                type: 'select',
                label: 'Month',
                options: monthFilterOptions,
              },
              {
                column: 'staffName',
                placeholder: 'Filter by staff',
                type: 'select',
                options: staffNameOptions,
                label: 'Staff',
              },
              {
                column: 'status',
                placeholder: 'Filter by status',
                type: 'select',
                label: 'Status',
                options: [
                  { label: 'All', value: 'all' },
                  { label: 'Pending', value: 'pending' },
                  { label: 'Paid', value: 'paid' },
                ],
              },
            ]}
          />
        </>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? 'Edit Salary Record' : 'New Salary Record'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Staff Member</Label>
              <Select
                value={staffUserId}
                onValueChange={setStaffUserId}
                disabled={!!editing}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select staff" />
                </SelectTrigger>
                <SelectContent>
                  {staffMembers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} ({s.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Designation</Label>
                <Input
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  placeholder="e.g. Teacher, Clerk"
                />
              </div>
              <div className="space-y-2">
                <Label>Month</Label>
                <Input
                  type="month"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  disabled={!!editing}
                  required
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Basic Pay</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={basicPay}
                  onChange={(e) => setBasicPay(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Allowances</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={allowances}
                  onChange={(e) => setAllowances(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Deductions</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={deductions}
                  onChange={(e) => setDeductions(e.target.value)}
                />
              </div>
            </div>
            <div className="rounded-md bg-muted p-3 text-sm">
              Net Pay:{' '}
              <span className="font-semibold">{formatCurrency(netPay)}</span>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes"
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={
                saveMutation.isPending ||
                (!editing && !staffUserId) ||
                !basicPay ||
                !month
              }
            >
              {saveMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Mark as Paid Dialog */}
      <Dialog
        open={payDialog !== null}
        onOpenChange={(open) => !open && setPayDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Salary as Paid</DialogTitle>
          </DialogHeader>
          {payDialog && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {payDialog.staffName} &mdash;{' '}
                {format(parseISO(payDialog.month + '-01'), 'MMM yyyy')} &mdash;{' '}
                <span className="font-semibold">
                  {formatCurrency(payDialog.netPay)}
                </span>
              </p>
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select value={payMethod} onValueChange={setPayMethod}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Paid Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !payDate && 'text-muted-foreground',
                      )}
                    >
                      <Calendar03Icon className="mr-2 size-4" />
                      {payDate
                        ? format(parseISO(payDate), 'dd MMM yyyy')
                        : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      captionLayout="dropdown"
                      selected={payDate ? parseISO(payDate) : undefined}
                      onSelect={(d) =>
                        setPayDate(d ? format(d, 'yyyy-MM-dd') : '')
                      }
                      startMonth={new Date(2020, 0)}
                      endMonth={new Date(2030, 11)}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <Button
                className="w-full"
                disabled={payMutation.isPending || !payMethod}
                onClick={() => payMutation.mutate()}
              >
                {payMutation.isPending ? 'Processing...' : 'Confirm Payment'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={bulkPayOpen} onOpenChange={setBulkPayOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Mark salaries as paid</DialogTitle>
            <DialogDescription>
              {unpaidSelected.length} pending salary record(s) will be marked
              paid on the date below.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label htmlFor="bulk-salary-date">Paid date</Label>
              <Input
                id="bulk-salary-date"
                type="date"
                value={bulkPayDate}
                onChange={(e) => setBulkPayDate(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="bulk-salary-method">Payment method</Label>
              <Select value={bulkPayMethod} onValueChange={setBulkPayMethod}>
                <SelectTrigger id="bulk-salary-method" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkPayOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={
                unpaidSelected.length === 0 ||
                !bulkPayDate ||
                !bulkPayMethod ||
                bulkPayMutation.isPending
              }
              onClick={() =>
                bulkPayMutation.mutate({
                  salaryIds: unpaidSelected.map((s) => s.id),
                  paymentMethod: bulkPayMethod,
                  paidDate: bulkPayDate,
                })
              }
            >
              {bulkPayMutation.isPending ? 'Processing...' : 'Apply'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete salary records</AlertDialogTitle>
            <AlertDialogDescription>
              Permanently delete {selected.length} salary record(s)? This cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() =>
                bulkDeleteMutation.mutate(selected.map((s) => s.id))
              }
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete salary record?"
        description="This will permanently delete this salary record."
        confirmLabel="Delete"
        onConfirm={() => {
          if (deleteId !== null) deleteMutation.mutate(deleteId)
          setDeleteId(null)
        }}
      />
    </div>
  )
}
