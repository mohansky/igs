import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Label } from '#/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { Skeleton } from '#/components/ui/skeleton'
import { ConfirmDialog } from '#/components/dashboard/ConfirmDialog'
import { cn, formatCurrency, formatDate } from '#/lib/utils'
import {
  currentFyStartYear,
  fyEndDate,
  fyLabel,
  fyRangeLabel,
} from '#/lib/financial-year'
import {
  getAccountingSettings,
  getYearEndSummary,
  listFinancialYears,
  setBooksLockedThrough,
} from '#/server/accounting'

export function YearEndClosing() {
  const queryClient = useQueryClient()
  const [selectedFy, setSelectedFy] = useState(currentFyStartYear())
  const [closeOpen, setCloseOpen] = useState(false)
  const [reopenOpen, setReopenOpen] = useState(false)

  const { data: years = [] } = useQuery({
    queryKey: ['financial-years'],
    queryFn: () => listFinancialYears(),
  })

  const { data: settings } = useQuery({
    queryKey: ['accounting-settings'],
    queryFn: () => getAccountingSettings(),
  })

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['year-end-summary', selectedFy],
    queryFn: () => getYearEndSummary({ data: { fyStartYear: selectedFy } }),
  })

  const lockedThrough = settings?.booksLockedThrough ?? null
  const selectedEnd = fyEndDate(selectedFy)
  const today = format(new Date(), 'yyyy-MM-dd')
  const yearHasEnded = selectedEnd < today
  const alreadyClosed = lockedThrough !== null && selectedEnd <= lockedThrough

  const lockMutation = useMutation({
    mutationFn: (date: string | null) =>
      setBooksLockedThrough({ data: { date } }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['accounting-settings'] })
      toast.success(
        res.booksLockedThrough
          ? `Books closed through ${formatDate(res.booksLockedThrough)}`
          : 'Books reopened',
      )
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : 'Failed to update lock'),
  })

  const rows: Array<{ label: string; value: number; emphasis?: boolean }> =
    summary
      ? [
          { label: 'Fees collected', value: summary.feesCollected },
          { label: 'Other income', value: summary.manualIncome },
          { label: 'Total income', value: summary.totalIncome, emphasis: true },
          { label: 'Salaries paid', value: summary.salariesPaid },
          { label: 'Other expenses', value: summary.manualExpenses },
          {
            label: 'Total expenses',
            value: summary.totalExpenses,
            emphasis: true,
          },
        ]
      : []

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Year-end closing</CardTitle>
          {lockedThrough ? (
            <Badge variant="secondary">
              Books closed through {formatDate(lockedThrough)}
            </Badge>
          ) : (
            <Badge variant="outline">Books open</Badge>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col gap-1 sm:max-w-xs">
            <Label htmlFor="year-end-fy">Financial year</Label>
            <Select
              value={String(selectedFy)}
              onValueChange={(v) => setSelectedFy(Number(v))}
            >
              <SelectTrigger id="year-end-fy" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {fyLabel(y)} ({fyRangeLabel(y)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {summaryLoading || !summary ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-5 w-full max-w-md" />
              ))}
            </div>
          ) : (
            <div className="max-w-md space-y-1">
              {rows.map((row) => (
                <div
                  key={row.label}
                  className={cn(
                    'flex items-center justify-between py-1 text-sm',
                    row.emphasis && 'border-t font-medium',
                  )}
                >
                  <span>{row.label}</span>
                  <span>{formatCurrency(row.value)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between border-t pt-2 text-base font-bold">
                <span>Net for {fyLabel(selectedFy)}</span>
                <span
                  className={cn(
                    summary.net >= 0 ? 'text-green-600' : 'text-red-600',
                  )}
                >
                  {summary.net >= 0 ? '+' : '-'}
                  {formatCurrency(Math.abs(summary.net))}
                </span>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Closing a year locks all transactions, fee payments, and salary
              payments dated on or before {formatDate(selectedEnd)}. Nothing is
              deleted or archived — locked entries stay visible in reports but
              can no longer be added, edited, or removed.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={
                  !yearHasEnded || alreadyClosed || lockMutation.isPending
                }
                onClick={() => setCloseOpen(true)}
              >
                Close {fyLabel(selectedFy)}
              </Button>
              {lockedThrough && (
                <Button
                  variant="outline"
                  disabled={lockMutation.isPending}
                  onClick={() => setReopenOpen(true)}
                >
                  Reopen books
                </Button>
              )}
            </div>
            {!yearHasEnded && (
              <p className="text-xs text-muted-foreground">
                {fyLabel(selectedFy)} can be closed after it ends on{' '}
                {formatDate(selectedEnd)}.
              </p>
            )}
            {alreadyClosed && (
              <p className="text-xs text-muted-foreground">
                {fyLabel(selectedFy)} is already closed.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={closeOpen}
        onOpenChange={setCloseOpen}
        title={`Close ${fyLabel(selectedFy)}?`}
        description={`All entries dated on or before ${formatDate(selectedEnd)} will be locked against changes. You can reopen the books later if a correction is needed.`}
        confirmLabel="Close year"
        onConfirm={() => {
          lockMutation.mutate(selectedEnd)
          setCloseOpen(false)
        }}
      />
      <ConfirmDialog
        open={reopenOpen}
        onOpenChange={setReopenOpen}
        title="Reopen books?"
        description={`This removes the lock${lockedThrough ? ` (currently through ${formatDate(lockedThrough)})` : ''} so past entries can be edited again. Close the year again once corrections are done.`}
        confirmLabel="Reopen"
        onConfirm={() => {
          lockMutation.mutate(null)
          setReopenOpen(false)
        }}
      />
    </div>
  )
}
