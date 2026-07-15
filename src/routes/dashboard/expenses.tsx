import { createFileRoute, redirect } from '@tanstack/react-router'
import { useMemo, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { format, parseISO } from 'date-fns'
import type { ColumnDef } from '@tanstack/react-table'
import { Calendar03Icon, FileAttachmentIcon } from 'hugeicons-react'
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs'
import { CustomDataTable } from '#/components/dashboard/CustomDataTable'
import { ConfirmDialog } from '#/components/dashboard/ConfirmDialog'
import { MonthlyFinanceOverview } from '#/components/dashboard/MonthlyFinanceOverview'
import { YearEndClosing } from '#/components/dashboard/YearEndClosing'
import { Skeleton } from '#/components/ui/skeleton'
import { cn, formatCurrency, formatDate } from '#/lib/utils'
import { downloadCsv } from '#/lib/csv'
import { currentFyStartYear, fyLabel } from '#/lib/financial-year'
import DownloadIcon from '#/components/icons/DownloadIcon'
import {
  listTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  bulkDeleteTransactions,
} from '#/server/transactions'
import { getAccountingSettings, listFinancialYears } from '#/server/accounting'
import { uploadToR2 } from '#/server/upload'
import TrashIcon from '#/components/icons/TrashIcon'
import EditIcon from '#/components/icons/EditIcon'
import { IconButton } from '#/components/dashboard/IconButton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import AddIcon from '#/components/icons/AddIcon'
import type { TransactionType } from '#/server/transactions'

const R2_BASE_URL = import.meta.env.VITE_R2_BASE_URL ?? ''

function resolveAttachmentUrl(url: string): string {
  if (url.startsWith('http') || url.startsWith('data:')) return url
  const base = R2_BASE_URL.endsWith('/') ? R2_BASE_URL : `${R2_BASE_URL}/`
  const path = url.startsWith('/') ? url.slice(1) : url
  return `${base}${path}`
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

function monthKeyFromDate(date: string | null | undefined): string | null {
  if (!date) return null
  const match = /^(\d{4})-(\d{2})/.exec(date)
  return match ? `${match[1]}-${match[2]}` : null
}

function monthLabel(key: string): string {
  const [year, month] = key.split('-')
  return `${MONTH_NAMES[Number(month) - 1]} ${year}`
}

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback
}

export const Route = createFileRoute('/dashboard/expenses')({
  beforeLoad: ({ context }) => {
    const userRole =
      (context.session.user as { role?: string }).role ?? 'student'
    if (userRole !== 'admin') {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: ExpensesPage,
})

interface Transaction {
  id: number
  type: TransactionType
  category: string
  amount: number
  date: string
  description: string | null
  paymentMethod: string | null
  receiptNumber: string | null
  vendor: string | null
  notes: string | null
  attachmentUrl: string | null
  attachmentType: 'file' | 'link' | null
}

const expenseCategories = [
  'Salaries',
  'Utilities',
  'Maintenance',
  'Supplies',
  'Equipment',
  'Transport',
  'Events',
  'Marketing',
  'Insurance',
  'Rent',
  'Other',
]

const incomeCategories = [
  'Donations',
  'Grants',
  'Rentals',
  'Events',
  'Interest',
  'Other',
]

const paymentMethods = ['Cash', 'Bank Transfer', 'Cheque', 'UPI', 'Card']

function ExpensesPage() {
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [selected, setSelected] = useState<Transaction[]>([])
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)

  // Form state
  const [type, setType] = useState<TransactionType>('expense')
  const [category, setCategory] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [description, setDescription] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [receiptNumber, setReceiptNumber] = useState('')
  const [vendor, setVendor] = useState('')
  const [notes, setNotes] = useState('')

  // Attachment state
  const [attachmentMode, setAttachmentMode] = useState<
    'none' | 'file' | 'link'
  >('none')
  const [attachmentLinkUrl, setAttachmentLinkUrl] = useState('')
  const [attachmentFileUrl, setAttachmentFileUrl] = useState('') // existing R2 URL when editing
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null) // newly selected file
  const attachmentInputRef = useRef<HTMLInputElement>(null)

  const [selectedMonth, setSelectedMonth] = useState<string>('all')
  const [selectedFy, setSelectedFy] = useState<string>(
    String(currentFyStartYear()),
  )

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['transactions', selectedFy],
    queryFn: () =>
      listTransactions({
        data: selectedFy === 'all' ? {} : { fyStartYear: Number(selectedFy) },
      }) as Promise<Transaction[]>,
  })

  const { data: fyYears = [] } = useQuery({
    queryKey: ['financial-years'],
    queryFn: () => listFinancialYears(),
  })

  const { data: accountingSettings } = useQuery({
    queryKey: ['accounting-settings'],
    queryFn: () => getAccountingSettings(),
  })
  const booksLockedThrough = accountingSettings?.booksLockedThrough ?? null

  const fyOptions = useMemo(
    () => [
      ...fyYears.map((y) => ({ label: fyLabel(y), value: String(y) })),
      { label: 'All years', value: 'all' },
    ],
    [fyYears],
  )

  const monthOptions = useMemo(() => {
    const keys = new Set<string>()
    for (const t of items) {
      const k = monthKeyFromDate(t.date)
      if (k) keys.add(k)
    }
    return [
      { label: 'All months', value: 'all' },
      ...Array.from(keys)
        .sort((a, b) => b.localeCompare(a))
        .map((k) => ({ label: monthLabel(k), value: k })),
    ]
  }, [items])

  const vendorOptions = useMemo(() => {
    const set = new Set<string>()
    for (const t of items) {
      if (t.vendor) set.add(t.vendor)
    }
    return [
      { label: 'All vendors', value: 'all' },
      ...Array.from(set)
        .sort()
        .map((v) => ({ label: v, value: v })),
    ]
  }, [items])

  const filteredItems = useMemo(() => {
    if (selectedMonth === 'all') return items
    return items.filter((t) => monthKeyFromDate(t.date) === selectedMonth)
  }, [items, selectedMonth])

  // Rows after the table's own filters (category, vendor, payment, search,
  // date range) — drives the summary cards and CSV export.
  const [visibleItems, setVisibleItems] = useState<Transaction[] | null>(null)
  const summaryItems = visibleItems ?? filteredItems

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['transactions'] })
    queryClient.invalidateQueries({ queryKey: ['monthly-overview'] })
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      let finalAttachmentUrl: string | null = null
      let finalAttachmentType: 'file' | 'link' | null = null

      if (attachmentMode === 'link' && attachmentLinkUrl.trim()) {
        finalAttachmentUrl = attachmentLinkUrl.trim()
        finalAttachmentType = 'link'
      } else if (attachmentMode === 'file') {
        if (attachmentFile) {
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = (e) => {
              const result = e.target?.result as string
              resolve(result.split(',')[1])
            }
            reader.onerror = reject
            reader.readAsDataURL(attachmentFile)
          })
          const result = await uploadToR2({
            data: {
              file: base64,
              fileName: attachmentFile.name,
              mimeType: attachmentFile.type,
              folder: 'receipts',
            },
          })
          finalAttachmentUrl = result.url
          finalAttachmentType = 'file'
        } else if (attachmentFileUrl) {
          finalAttachmentUrl = attachmentFileUrl
          finalAttachmentType = 'file'
        }
      }

      const payload = {
        type,
        category,
        amount: Number(amount),
        date,
        description: description || null,
        paymentMethod: paymentMethod || null,
        receiptNumber: receiptNumber || null,
        vendor: vendor || null,
        notes: notes || null,
        attachmentUrl: finalAttachmentUrl,
        attachmentType: finalAttachmentType,
      }
      if (editing) {
        await updateTransaction({ data: { id: editing.id, updates: payload } })
      } else {
        await createTransaction({ data: payload })
      }
    },
    onSuccess: () => {
      setDialogOpen(false)
      invalidate()
      toast.success(editing ? 'Transaction updated' : 'Transaction added')
    },
    onError: (err) =>
      toast.error(errorMessage(err, 'Failed to save transaction')),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteTransaction({ data: { id } }),
    onSuccess: (_, id) => {
      setSelected((prev) => prev.filter((t) => t.id !== id))
      invalidate()
      toast.success('Transaction deleted')
    },
    onError: (err) =>
      toast.error(errorMessage(err, 'Failed to delete transaction')),
  })

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: number[]) => bulkDeleteTransactions({ data: { ids } }),
    onSuccess: (res) => {
      toast.success(`Deleted ${res.deleted} transaction(s)`)
      setSelected([])
      setBulkDeleteOpen(false)
      invalidate()
    },
    onError: (err) =>
      toast.error(errorMessage(err, 'Failed to delete transactions')),
  })

  const resetForm = () => {
    setType('expense')
    setCategory('')
    setAmount('')
    setDate(format(new Date(), 'yyyy-MM-dd'))
    setDescription('')
    setPaymentMethod('')
    setReceiptNumber('')
    setVendor('')
    setNotes('')
    setAttachmentMode('none')
    setAttachmentLinkUrl('')
    setAttachmentFileUrl('')
    setAttachmentFile(null)
  }

  const openCreate = () => {
    setEditing(null)
    resetForm()
    setDialogOpen(true)
  }

  const openEdit = (txn: Transaction) => {
    setEditing(txn)
    setType(txn.type)
    setCategory(txn.category)
    setAmount(txn.amount.toString())
    setDate(txn.date)
    setDescription(txn.description ?? '')
    setPaymentMethod(txn.paymentMethod ?? '')
    setReceiptNumber(txn.receiptNumber ?? '')
    setVendor(txn.vendor ?? '')
    setNotes(txn.notes ?? '')
    setAttachmentMode(
      txn.attachmentType === 'file'
        ? 'file'
        : txn.attachmentType === 'link'
          ? 'link'
          : 'none',
    )
    setAttachmentLinkUrl(
      txn.attachmentType === 'link' ? (txn.attachmentUrl ?? '') : '',
    )
    setAttachmentFileUrl(
      txn.attachmentType === 'file' ? (txn.attachmentUrl ?? '') : '',
    )
    setAttachmentFile(null)
    setDialogOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    saveMutation.mutate()
  }

  const handleDelete = (id: number) => {
    setDeleteId(id)
  }

  const categories = type === 'income' ? incomeCategories : expenseCategories

  // Summary calculations follow every active filter, including the
  // table's column filters
  const totalIncome = summaryItems
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0)
  const totalExpenses = summaryItems
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0)
  const balance = totalIncome - totalExpenses

  const columns: ColumnDef<Transaction>[] = [
    {
      accessorKey: 'date',
      header: 'Date',
      cell: ({ row }) => formatDate(row.getValue('date')),
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }) => (
        <Badge
          variant={
            row.getValue('type') === 'income' ? 'default' : 'destructive'
          }
        >
          {(row.getValue('type') as string) === 'income' ? 'Income' : 'Expense'}
        </Badge>
      ),
    },
    {
      accessorKey: 'category',
      header: 'Category',
      filterFn: (row, _id, value) => {
        if (!value || value === 'all') return true
        return row.getValue('category') === value
      },
    },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: ({ row }) => row.getValue('description') ?? '-',
    },
    {
      accessorKey: 'vendor',
      header: 'Vendor',
      cell: ({ row }) => row.getValue('vendor') ?? '-',
      filterFn: (row, _id, value) => {
        if (!value || value === 'all') return true
        return row.getValue('vendor') === value
      },
    },
    {
      accessorKey: 'amount',
      header: 'Amount',
      cell: ({ row }) => {
        const txn = row.original
        return (
          <span
            className={cn(
              'font-medium',
              txn.type === 'income' ? 'text-green-600' : 'text-red-600',
            )}
          >
            {txn.type === 'income' ? '+' : '-'}
            {formatCurrency(txn.amount)}
          </span>
        )
      },
    },
    {
      accessorKey: 'paymentMethod',
      header: 'Payment',
      cell: ({ row }) => row.getValue('paymentMethod') ?? '-',
      filterFn: (row, _id, value) => {
        if (!value || value === 'all') return true
        return row.getValue('paymentMethod') === value
      },
    },
    {
      id: 'attachment',
      header: 'Attachment',
      enableSorting: false,
      cell: ({ row }) => {
        const txn = row.original
        if (!txn.attachmentUrl)
          return <span className="text-muted-foreground">—</span>
        const href =
          txn.attachmentType === 'file'
            ? resolveAttachmentUrl(txn.attachmentUrl)
            : txn.attachmentUrl
        return (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-primary hover:underline text-sm"
          >
            <FileAttachmentIcon className="size-4 shrink-0" />
            {txn.attachmentType === 'link' ? 'Link' : 'File'}
          </a>
        )
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      enableSorting: false,
      cell: ({ row }) => {
        const txn = row.original
        return (
          <div className="flex gap-1">
            <IconButton
              size="xs"
              tooltip="Edit"
              icon={EditIcon}
              className="text-primary"
              onClick={() => openEdit(txn)}
            />
            <IconButton
              size="xs"
              tooltip="Delete"
              icon={TrashIcon}
              className="text-destructive"
              onClick={() => handleDelete(txn.id)}
            />
          </div>
        )
      },
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold">Expenses & Income</h1>
          {booksLockedThrough && (
            <Badge variant="secondary">
              Books closed through {formatDate(booksLockedThrough)}
            </Badge>
          )}
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}>
              <AddIcon className="h-4 w-4" />
              Add Transaction
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editing ? 'Edit Transaction' : 'New Transaction'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={type}
                  onValueChange={(v) => {
                    setType(v as TransactionType)
                    setCategory('')
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expense">Expense</SelectItem>
                    <SelectItem value="income">Income</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Amount</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !date && 'text-muted-foreground',
                      )}
                    >
                      <Calendar03Icon className="mr-2 size-4" />
                      {date
                        ? format(parseISO(date), 'dd MMM yyyy')
                        : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      captionLayout="dropdown"
                      selected={date ? parseISO(date) : undefined}
                      onSelect={(d) =>
                        setDate(d ? format(d, 'yyyy-MM-dd') : '')
                      }
                      startMonth={new Date(2020, 0)}
                      endMonth={new Date(2030, 11)}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Vendor / Payee</Label>
                  <Input
                    value={vendor}
                    onChange={(e) => setVendor(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Payment Method</Label>
                  <Select
                    value={paymentMethod}
                    onValueChange={setPaymentMethod}
                  >
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
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Receipt / Ref #</Label>
                  <Input
                    value={receiptNumber}
                    onChange={(e) => setReceiptNumber(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Attachment (optional)</Label>
                <div className="flex gap-1">
                  {(['none', 'file', 'link'] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => {
                        setAttachmentMode(mode)
                        if (mode !== 'file') setAttachmentFile(null)
                      }}
                      className={cn(
                        'rounded-md px-3 py-1 text-sm border transition-colors',
                        attachmentMode === mode
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'border-input hover:bg-muted',
                      )}
                    >
                      {mode === 'none'
                        ? 'None'
                        : mode === 'file'
                          ? 'Upload file'
                          : 'External link'}
                    </button>
                  ))}
                </div>

                {attachmentMode === 'file' && (
                  <div className="space-y-2">
                    <input
                      ref={attachmentInputRef}
                      type="file"
                      accept="image/jpeg,image/png,application/pdf"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0] ?? null
                        setAttachmentFile(file)
                        setAttachmentFileUrl('')
                      }}
                    />
                    {attachmentFile ? (
                      <div className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                        <FileAttachmentIcon className="size-4 shrink-0 text-muted-foreground" />
                        <span className="truncate flex-1">
                          {attachmentFile.name}
                        </span>
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            setAttachmentFile(null)
                            if (attachmentInputRef.current)
                              attachmentInputRef.current.value = ''
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ) : attachmentFileUrl ? (
                      <div className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                        <FileAttachmentIcon className="size-4 shrink-0 text-muted-foreground" />
                        <span className="truncate flex-1 text-muted-foreground">
                          {attachmentFileUrl.split('/').pop()}
                        </span>
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-foreground"
                          onClick={() => setAttachmentFileUrl('')}
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => attachmentInputRef.current?.click()}
                      >
                        Choose file
                      </Button>
                    )}
                    <p className="text-xs text-muted-foreground">
                      JPG, PNG, PDF · Max 5 MB
                    </p>
                  </div>
                )}

                {attachmentMode === 'link' && (
                  <Input
                    value={attachmentLinkUrl}
                    onChange={(e) => setAttachmentLinkUrl(e.target.value)}
                    placeholder="https://drive.google.com/..."
                    type="url"
                  />
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={saveMutation.isPending || !category || !amount}
              >
                {saveMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="transactions">
        <TabsList>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="overview">Monthly Overview</TabsTrigger>
          <TabsTrigger value="year-end">Year-end</TabsTrigger>
        </TabsList>
        <TabsContent value="transactions" className="space-y-6">
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
                      <div
                        key={r}
                        className="flex items-center gap-4 px-4 py-3"
                      >
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-5 w-16 rounded-full" />
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-20" />
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
                      Total Income
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-green-600">
                      +{formatCurrency(totalIncome)}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Total Expenses
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-red-600">
                      -{formatCurrency(totalExpenses)}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Balance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p
                      className={cn(
                        'text-2xl font-bold',
                        balance >= 0 ? 'text-green-600' : 'text-red-600',
                      )}
                    >
                      {balance >= 0 ? '+' : '-'}
                      {formatCurrency(Math.abs(balance))}
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

              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={summaryItems.length === 0}
                  onClick={() =>
                    downloadCsv(
                      summaryItems,
                      [
                        { key: 'date', label: 'Date' },
                        { key: 'type', label: 'Type' },
                        { key: 'category', label: 'Category' },
                        { key: 'description', label: 'Description' },
                        { key: 'vendor', label: 'Vendor' },
                        { key: 'amount', label: 'Amount' },
                        { key: 'paymentMethod', label: 'Payment Method' },
                        { key: 'receiptNumber', label: 'Receipt #' },
                        { key: 'notes', label: 'Notes' },
                      ],
                      selectedMonth !== 'all'
                        ? `transactions-${selectedMonth}`
                        : selectedFy !== 'all'
                          ? `transactions-fy-${selectedFy}`
                          : 'transactions-all',
                    )
                  }
                >
                  <DownloadIcon className="h-4 w-4" />
                  Export CSV
                </Button>
              </div>

              <CustomDataTable
                tableId="expenses"
                columns={columns}
                data={filteredItems}
                enableSelection
                onSelectionChange={setSelected}
                onFilteredRowsChange={setVisibleItems}
                showDatePicker
                dateField="date"
                datePickerExtras={
                  <>
                    <div className="flex flex-col gap-1">
                      <Label htmlFor="txn-fy-filter">Financial year</Label>
                      <Select
                        value={selectedFy}
                        onValueChange={(v) => {
                          setSelectedFy(v)
                          setSelectedMonth('all')
                        }}
                      >
                        <SelectTrigger id="txn-fy-filter" className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {fyOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <Label htmlFor="txn-month-filter">Month</Label>
                      <Select
                        value={selectedMonth}
                        onValueChange={setSelectedMonth}
                      >
                        <SelectTrigger id="txn-month-filter" className="w-52">
                          <SelectValue placeholder="All months" />
                        </SelectTrigger>
                        <SelectContent>
                          {monthOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                }
                filters={[
                  {
                    column: 'description',
                    placeholder: 'Search description...',
                    label: 'Description',
                  },
                  {
                    column: 'category',
                    placeholder: 'Filter by category',
                    type: 'select',
                    label: 'Category',
                    options: [
                      { label: 'All', value: 'all' },
                      ...[...expenseCategories, ...incomeCategories]
                        .filter((v, i, a) => a.indexOf(v) === i)
                        .sort()
                        .map((c) => ({ label: c, value: c })),
                    ],
                  },
                  {
                    column: 'vendor',
                    placeholder: 'Filter by vendor',
                    type: 'select',
                    label: 'Vendor',
                    options: vendorOptions,
                  },
                  {
                    column: 'paymentMethod',
                    placeholder: 'Filter by payment',
                    type: 'select',
                    label: 'Payment',
                    options: [
                      { label: 'All', value: 'all' },
                      ...paymentMethods.map((m) => ({ label: m, value: m })),
                    ],
                  },
                ]}
              />
            </>
          )}
        </TabsContent>
        <TabsContent value="overview">
          <MonthlyFinanceOverview />
        </TabsContent>
        <TabsContent value="year-end">
          <YearEndClosing />
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete transaction?"
        description="This will permanently delete this transaction record."
        confirmLabel="Delete"
        onConfirm={() => {
          if (deleteId !== null) deleteMutation.mutate(deleteId)
          setDeleteId(null)
        }}
      />

      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete transactions</AlertDialogTitle>
            <AlertDialogDescription>
              Permanently delete {selected.length} transaction(s)? This cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                bulkDeleteMutation.mutate(selected.map((t) => t.id))
              }
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
