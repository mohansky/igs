import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Label } from '#/components/ui/label'
import { ToggleGroup, ToggleGroupItem } from '#/components/ui/toggle-group'
import { Skeleton } from '#/components/ui/skeleton'
import { CustomDataTable } from '#/components/dashboard/CustomDataTable'
import DownloadIcon from '#/components/icons/DownloadIcon'
import { cn, formatCurrency } from '#/lib/utils'
import { downloadCsv } from '#/lib/csv'
import {
  getMonthlyOverview,
  type MonthlyOverviewRow,
} from '#/server/transactions'

type RangeValue = '3' | '6' | '9' | '12' | 'all'

const RANGE_OPTIONS: { value: RangeValue; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: '3', label: '3M' },
  { value: '6', label: '6M' },
  { value: '9', label: '9M' },
  { value: '12', label: '12M' },
]

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

function monthLabel(key: string): string {
  const [year, month] = key.split('-')
  const idx = Number(month) - 1
  if (idx < 0 || idx > 11) return key
  return `${MONTH_NAMES[idx]} ${year}`
}

export function MonthlyFinanceOverview() {
  const [range, setRange] = useState<RangeValue>('12')

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['monthly-overview'],
    queryFn: () => getMonthlyOverview(),
  })

  // Server already returns rows sorted newest-first, so slicing gives the last N.
  const filteredRows = useMemo(() => {
    if (range === 'all') return rows
    return rows.slice(0, Number(range))
  }, [rows, range])

  const totals = useMemo(() => {
    return filteredRows.reduce(
      (acc, r) => ({
        manualIncome: acc.manualIncome + r.manualIncome,
        feesCollected: acc.feesCollected + r.feesCollected,
        totalIncome: acc.totalIncome + r.totalIncome,
        manualExpenses: acc.manualExpenses + r.manualExpenses,
        salariesPaid: acc.salariesPaid + r.salariesPaid,
        totalExpenses: acc.totalExpenses + r.totalExpenses,
        net: acc.net + r.net,
      }),
      {
        manualIncome: 0,
        feesCollected: 0,
        totalIncome: 0,
        manualExpenses: 0,
        salariesPaid: 0,
        totalExpenses: 0,
        net: 0,
      },
    )
  }, [filteredRows])

  const columns: ColumnDef<MonthlyOverviewRow>[] = [
    {
      accessorKey: 'month',
      header: 'Month',
      cell: ({ row }) => (
        <span className="font-medium">{monthLabel(row.getValue('month'))}</span>
      ),
    },
    {
      accessorKey: 'manualIncome',
      header: 'Other Income',
      cell: ({ row }) => formatCurrency(row.getValue('manualIncome') as number),
    },
    {
      accessorKey: 'feesCollected',
      header: 'Fees Collected',
      cell: ({ row }) => (
        <Link to="/dashboard/fees" className="text-primary hover:underline">
          {formatCurrency(row.getValue('feesCollected') as number)}
        </Link>
      ),
    },
    {
      accessorKey: 'totalIncome',
      header: 'Total Income',
      cell: ({ row }) => (
        <span className="font-semibold text-green-600">
          {formatCurrency(row.getValue('totalIncome') as number)}
        </span>
      ),
    },
    {
      accessorKey: 'manualExpenses',
      header: 'Other Expenses',
      cell: ({ row }) =>
        formatCurrency(row.getValue('manualExpenses') as number),
    },
    {
      accessorKey: 'salariesPaid',
      header: 'Salaries Paid',
      cell: ({ row }) => (
        <Link to="/dashboard/salaries" className="text-primary hover:underline">
          {formatCurrency(row.getValue('salariesPaid') as number)}
        </Link>
      ),
    },
    {
      accessorKey: 'totalExpenses',
      header: 'Total Expenses',
      cell: ({ row }) => (
        <span className="font-semibold text-red-600">
          {formatCurrency(row.getValue('totalExpenses') as number)}
        </span>
      ),
    },
    {
      accessorKey: 'net',
      header: 'Net',
      cell: ({ row }) => {
        const net = row.getValue('net') as number
        return (
          <span
            className={cn(
              'font-bold',
              net >= 0 ? 'text-green-600' : 'text-red-600',
            )}
          >
            {net >= 0 ? '+' : '-'}
            {formatCurrency(Math.abs(net))}
          </span>
        )
      },
    },
  ]

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
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
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {Array.from({ length: 6 }).map((_, r) => (
                <div key={r} className="flex items-center gap-4 px-4 py-3">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <Label htmlFor="monthly-overview-range">Range</Label>
          <ToggleGroup
            id="monthly-overview-range"
            type="single"
            variant="outline"
            value={range}
            onValueChange={(v) => {
              if (v) setRange(v as RangeValue)
            }}
          >
            {RANGE_OPTIONS.map((opt) => (
              <ToggleGroupItem key={opt.value} value={opt.value}>
                {opt.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={filteredRows.length === 0}
          onClick={() =>
            downloadCsv(
              filteredRows.map((r) => ({
                month: monthLabel(r.month),
                manualIncome: r.manualIncome,
                feesCollected: r.feesCollected,
                totalIncome: r.totalIncome,
                manualExpenses: r.manualExpenses,
                salariesPaid: r.salariesPaid,
                totalExpenses: r.totalExpenses,
                net: r.net,
              })),
              [
                { key: 'month', label: 'Month' },
                { key: 'manualIncome', label: 'Other Income' },
                { key: 'feesCollected', label: 'Fees Collected' },
                { key: 'totalIncome', label: 'Total Income' },
                { key: 'manualExpenses', label: 'Other Expenses' },
                { key: 'salariesPaid', label: 'Salaries Paid' },
                { key: 'totalExpenses', label: 'Total Expenses' },
                { key: 'net', label: 'Net' },
              ],
              range === 'all'
                ? 'monthly-overview-all'
                : `monthly-overview-${range}m`,
            )
          }
        >
          <DownloadIcon className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Income (All Sources)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              +{formatCurrency(totals.totalIncome)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatCurrency(totals.feesCollected)} fees ·{' '}
              {formatCurrency(totals.manualIncome)} other
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Expenses (All Sources)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">
              -{formatCurrency(totals.totalExpenses)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatCurrency(totals.salariesPaid)} salaries ·{' '}
              {formatCurrency(totals.manualExpenses)} other
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Net
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={cn(
                'text-2xl font-bold',
                totals.net >= 0 ? 'text-green-600' : 'text-red-600',
              )}
            >
              {totals.net >= 0 ? '+' : '-'}
              {formatCurrency(Math.abs(totals.net))}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Across {filteredRows.length} month
              {filteredRows.length === 1 ? '' : 's'}
            </p>
          </CardContent>
        </Card>
      </div>

      <CustomDataTable
        tableId="monthly-overview"
        columns={columns}
        data={filteredRows}
      />
    </div>
  )
}
