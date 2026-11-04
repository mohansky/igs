import { Fragment, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardContent } from '#/components/ui/card'
import { Skeleton } from '#/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { downloadCsv } from '#/lib/csv'
import { formatCurrency } from '#/lib/utils'
import { getFeeCategorySummary } from '#/server/fee-categories'
import type { FeeCategorySummaryRow } from '#/server/fee-categories'

const selectClass =
  'flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'

type Totals = Pick<
  FeeCategorySummaryRow,
  'billed' | 'received' | 'pending' | 'feeCount'
>

const sumRows = (rows: FeeCategorySummaryRow[]): Totals =>
  rows.reduce(
    (t, r) => ({
      billed: t.billed + r.billed,
      received: t.received + r.received,
      pending: t.pending + r.pending,
      feeCount: t.feeCount + r.feeCount,
    }),
    { billed: 0, received: 0, pending: 0, feeCount: 0 },
  )

function AmountCells({ t }: { t: Totals }) {
  return (
    <>
      <TableCell className="text-right">{t.feeCount}</TableCell>
      <TableCell className="text-right">{formatCurrency(t.billed)}</TableCell>
      <TableCell className="text-right">{formatCurrency(t.received)}</TableCell>
      <TableCell className="text-right">{formatCurrency(t.pending)}</TableCell>
    </>
  )
}

// The Fees page's Fee Summary tab, for admin + auditor (trustees).
export function FeeSummary() {
  const [year, setYear] = useState<string | undefined>(undefined)
  const { data: summary, isLoading } = useQuery({
    queryKey: ['fee-category-summary', year ?? 'latest'],
    queryFn: () => getFeeCategorySummary({ data: { academicYear: year } }),
  })

  const rows = summary?.rows ?? []
  // Uncategorised (older) fees count with fee income.
  const groups = [
    { label: 'Fee income', rows: rows.filter((r) => !r.isPassThrough) },
    {
      label: 'Pass-through (cost recovery)',
      rows: rows.filter((r) => r.isPassThrough),
    },
  ].filter((g) => g.rows.length > 0)

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Billed, received and pending per fee category, for fees due in the
        school year (May to April).
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <select
          className={selectClass}
          value={summary?.academicYear ?? ''}
          onChange={(e) => setYear(e.target.value)}
          disabled={!summary?.years.length}
        >
          {(summary?.years ?? []).map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <Button
          variant="outline"
          size="sm"
          disabled={rows.length === 0}
          onClick={() =>
            downloadCsv(
              rows.map((r) => ({
                ...r,
                type: r.isPassThrough ? 'Pass-through' : 'Fee income',
              })),
              [
                { key: 'name', label: 'Category' },
                { key: 'type', label: 'Type' },
                { key: 'feeCount', label: 'Fees' },
                { key: 'billed', label: 'Billed' },
                { key: 'received', label: 'Received' },
                { key: 'pending', label: 'Pending' },
              ],
              `fee-summary-${summary?.academicYear ?? ''}`,
            )
          }
        >
          Export CSV
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No fees{summary?.academicYear ? ` for ${summary.academicYear}` : ''}
            .
          </CardContent>
        </Card>
      ) : (
        <Card className="p-0">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Fees</TableHead>
                  <TableHead className="text-right">Billed</TableHead>
                  <TableHead className="text-right">Received</TableHead>
                  <TableHead className="text-right">Pending</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groups.map((g) => (
                  <Fragment key={g.label}>
                    {g.rows.map((r) => (
                      <TableRow key={r.categoryId ?? 'uncategorised'}>
                        <TableCell>
                          {r.categoryId === null ? (
                            <span className="text-muted-foreground">
                              {r.name}
                            </span>
                          ) : (
                            r.name
                          )}
                          {r.isPassThrough && (
                            <Badge
                              variant="outline"
                              className="ml-2 text-[10px]"
                            >
                              pass-through
                            </Badge>
                          )}
                        </TableCell>
                        <AmountCells t={r} />
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/40 font-medium">
                      <TableCell>Subtotal · {g.label}</TableCell>
                      <AmountCells t={sumRows(g.rows)} />
                    </TableRow>
                  </Fragment>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow className="font-semibold">
                  <TableCell>Total</TableCell>
                  <AmountCells t={sumRows(rows)} />
                </TableRow>
              </TableFooter>
            </Table>
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-muted-foreground">
        Billed and pending leave out concession (open) tuition fees, which have
        no fixed amount; received includes payments made into them.
        Uncategorised are fees created before categories existed.
      </p>
    </div>
  )
}
