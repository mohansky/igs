import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent } from '#/components/ui/card'
import { Skeleton } from '#/components/ui/skeleton'
import { Button } from '#/components/ui/button'
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
import { formatCurrency, formatDate } from '#/lib/utils'
import { getConcessionReport } from '#/server/fee-plans'

const selectClass =
  'flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'

// The Fees page's Concessions tab. Admin + auditor (trustees) only: concession
// status is never shown to staff, parents, or on receipts.
export function ConcessionReport() {
  const [year, setYear] = useState<string | undefined>(undefined)
  const { data: report, isLoading } = useQuery({
    queryKey: ['concession-report', year ?? 'latest'],
    queryFn: () => getConcessionReport({ data: { academicYear: year } }),
  })

  const rows = report?.rows ?? []
  const totals = rows.reduce(
    (t, r) => ({
      referenceFee: t.referenceFee + r.referenceFee,
      received: t.received + r.received,
      concessionValue: t.concessionValue + r.concessionValue,
      payments: t.payments + r.payments,
    }),
    { referenceFee: 0, received: 0, concessionValue: 0, payments: 0 },
  )
  // While the year is still running, the value isn't final.
  const valueLabel = report?.ongoing
    ? 'Support given so far'
    : 'Concession value'

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Students paying what they can, against the standard fee for the year.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <select
          className={selectClass}
          value={report?.academicYear ?? ''}
          onChange={(e) => setYear(e.target.value)}
          disabled={!report?.years.length}
        >
          {(report?.years ?? []).map((y) => (
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
              rows,
              [
                { key: 'studentName', label: 'Student' },
                { key: 'className', label: 'Class' },
                { key: 'referenceFee', label: 'Reference fee' },
                { key: 'received', label: 'Total received' },
                { key: 'concessionValue', label: valueLabel },
                { key: 'payments', label: 'Payments' },
                { key: 'lastPaid', label: 'Last payment' },
              ],
              `concessions-${report?.academicYear ?? ''}`,
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
            No students on the concession plan
            {report?.academicYear ? ` for ${report.academicYear}` : ' yet'}. Set
            a student&apos;s plan from their profile&apos;s Fees tab.
          </CardContent>
        </Card>
      ) : (
        <Card className="p-0">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead className="text-right">Reference fee</TableHead>
                  <TableHead className="text-right">Total received</TableHead>
                  <TableHead className="text-right">{valueLabel}</TableHead>
                  <TableHead className="text-right">Payments</TableHead>
                  <TableHead>Last payment</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.studentProfileId}>
                    <TableCell>
                      <Link
                        to="/dashboard/students/$studentId"
                        params={{ studentId: String(r.studentProfileId) }}
                        className="font-medium text-primary hover:underline"
                      >
                        {r.studentName}
                      </Link>
                      {r.admissionNumber && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          ({r.admissionNumber})
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{r.className ?? '-'}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(r.referenceFee)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(r.received)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(r.concessionValue)}
                    </TableCell>
                    <TableCell className="text-right">{r.payments}</TableCell>
                    <TableCell>{formatDate(r.lastPaid)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow className="font-semibold">
                  <TableCell colSpan={2}>
                    Total · {rows.length} student{rows.length === 1 ? '' : 's'}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(totals.referenceFee)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(totals.received)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(totals.concessionValue)}
                  </TableCell>
                  <TableCell className="text-right">
                    {totals.payments}
                  </TableCell>
                  <TableCell />
                </TableRow>
              </TableFooter>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
