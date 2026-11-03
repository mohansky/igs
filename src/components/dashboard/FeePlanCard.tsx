import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { formatCurrency, formatDate } from '#/lib/utils'
import { schoolToday } from '#/lib/fee-math'
import { academicYearLabel, currentFyStartYear } from '#/lib/financial-year'
import { getFeePlanOptions, setStudentFeePlan } from '#/server/fee-plans'
import type { PlanType } from '#/server/fee-plans'

export interface FeePlan {
  id: number
  academicYear: string
  planType: string
  referenceFee: number | null
  openFeeId: number | null
  approvedOn: string | null
  approvedByName: string | null
  notes: string | null
}

const selectClass =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'

// Fee plan for the current academic year, with a dialog to change it.
// Admin-only: the student page only renders this for admins.
export function FeePlanCard({
  studentProfileId,
  plans,
}: {
  studentProfileId: number
  plans: FeePlan[]
}) {
  const currentYear = academicYearLabel(currentFyStartYear())
  const current = plans.find((p) => p.academicYear === currentYear)
  const isConcession = current?.planType === 'concession'
  const [open, setOpen] = useState(false)

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          Fee plan {currentYear}
          <Badge variant={isConcession ? 'warning' : 'outline'}>
            {isConcession ? 'Concession' : 'Standard'}
          </Badge>
        </CardTitle>
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          Change plan
        </Button>
      </CardHeader>
      <CardContent className="space-y-1 text-sm">
        {isConcession ? (
          <>
            <p>
              Pays what the family can. Reference fee:{' '}
              {formatCurrency(current.referenceFee ?? 0)}
            </p>
            <p className="text-xs text-muted-foreground">
              Approved
              {current.approvedByName ? ` by ${current.approvedByName}` : ''}
              {current.approvedOn
                ? ` on ${formatDate(current.approvedOn)}`
                : ''}
            </p>
            {current.notes && (
              <p className="text-xs text-muted-foreground">{current.notes}</p>
            )}
          </>
        ) : (
          <p className="text-muted-foreground">
            Standard fees apply for this year.
          </p>
        )}
        {plans
          .filter((p) => p.academicYear !== currentYear)
          .map((p) => (
            <p key={p.id} className="text-xs text-muted-foreground">
              {p.academicYear}:{' '}
              {p.planType === 'concession'
                ? `Concession (reference ${formatCurrency(p.referenceFee ?? 0)})`
                : 'Standard'}
            </p>
          ))}
      </CardContent>
      <ChangePlanDialog
        open={open}
        onOpenChange={setOpen}
        studentProfileId={studentProfileId}
        plans={plans}
        defaultYear={currentYear}
      />
    </Card>
  )
}

function ChangePlanDialog({
  open,
  onOpenChange,
  studentProfileId,
  plans,
  defaultYear,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  studentProfileId: number
  plans: FeePlan[]
  defaultYear: string
}) {
  const queryClient = useQueryClient()
  const fy = currentFyStartYear()
  const yearOptions = [fy - 1, fy, fy + 1].map(academicYearLabel)

  const [year, setYear] = useState(defaultYear)
  const existing = plans.find((p) => p.academicYear === year)
  const [planType, setPlanType] = useState<PlanType>('concession')
  // '' until the user touches it, then we stop applying suggestions.
  const [referenceFee, setReferenceFee] = useState('')
  const [convertFeeId, setConvertFeeId] = useState<string | null>(null)
  const [approvedOn, setApprovedOn] = useState(schoolToday())
  const [notes, setNotes] = useState('')

  const alreadyConcession = existing?.planType === 'concession'

  const { data: options } = useQuery({
    queryKey: ['fee-plan-options', studentProfileId, year],
    queryFn: () =>
      getFeePlanOptions({ data: { studentProfileId, academicYear: year } }),
    enabled: open && planType === 'concession' && !alreadyConcession,
  })

  const shownReference =
    referenceFee !== ''
      ? referenceFee
      : alreadyConcession
        ? String(existing?.referenceFee ?? '')
        : options?.suggestedReferenceFee != null
          ? String(options.suggestedReferenceFee)
          : ''
  const shownConvert =
    convertFeeId ??
    (options?.suggestedFeeId ? String(options.suggestedFeeId) : 'new')

  const reset = () => {
    setReferenceFee('')
    setConvertFeeId(null)
    setNotes('')
    setApprovedOn(schoolToday())
  }

  const mutation = useMutation({
    mutationFn: () =>
      setStudentFeePlan({
        data: {
          studentProfileId,
          academicYear: year,
          planType,
          referenceFee:
            planType === 'concession' ? Number(shownReference) : undefined,
          convertFeeId:
            planType === 'concession' &&
            !alreadyConcession &&
            shownConvert !== 'new'
              ? Number(shownConvert)
              : undefined,
          approvedOn,
          notes: notes || existing?.notes || undefined,
        },
      }),
    onSuccess: () => {
      toast.success('Fee plan updated')
      queryClient.invalidateQueries({
        queryKey: ['fee-plans', studentProfileId],
      })
      queryClient.invalidateQueries({ queryKey: ['fees'] })
      reset()
      onOpenChange(false)
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to update plan'),
  })

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset()
        onOpenChange(v)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change fee plan</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            mutation.mutate()
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="plan-year">Academic year</Label>
              <select
                id="plan-year"
                className={selectClass}
                value={year}
                onChange={(e) => {
                  setYear(e.target.value)
                  reset()
                }}
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan-type">Plan</Label>
              <select
                id="plan-type"
                className={selectClass}
                value={planType}
                onChange={(e) => setPlanType(e.target.value as PlanType)}
              >
                <option value="concession">
                  Concession (pay what you can)
                </option>
                <option value="standard">Standard</option>
              </select>
            </div>
          </div>

          {planType === 'standard' ? (
            <p className="text-sm text-muted-foreground">
              {alreadyConcession
                ? `The open fee for ${year} becomes a normal fee of ${formatCurrency(existing?.referenceFee ?? 0)}, with payments so far counted against it.`
                : `The student is already on the standard plan for ${year}.`}
            </p>
          ) : (
            <>
              {!alreadyConcession && (
                <div className="space-y-2">
                  <Label htmlFor="plan-fee">Fee for this year</Label>
                  <select
                    id="plan-fee"
                    className={selectClass}
                    value={shownConvert}
                    onChange={(e) => setConvertFeeId(e.target.value)}
                  >
                    {(options?.candidateFees ?? []).map((f) => (
                      <option key={f.id} value={String(f.id)}>
                        Convert: {f.description ?? 'Fee'} ·{' '}
                        {formatCurrency(f.amount)} · due {formatDate(f.dueDate)}
                        {f.paidAmount
                          ? ` (${formatCurrency(f.paidAmount)} paid)`
                          : ''}
                      </option>
                    ))}
                    <option value="new">Create a new open fee</option>
                  </select>
                  <p className="text-xs text-muted-foreground">
                    A converted fee keeps its payments but no longer has a fixed
                    amount due.
                  </p>
                </div>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="plan-ref">Reference fee</Label>
                  <Input
                    id="plan-ref"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={shownReference}
                    onChange={(e) => setReferenceFee(e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    The standard annual fee, for the concession report.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="plan-approved">Approved on</Label>
                  <Input
                    id="plan-approved"
                    type="date"
                    value={approvedOn}
                    onChange={(e) => setApprovedOn(e.target.value)}
                  />
                </div>
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="plan-notes">Notes (admin only)</Label>
            <Input
              id="plan-notes"
              value={notes}
              placeholder={existing?.notes ?? 'Optional'}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={
              mutation.isPending ||
              (planType === 'standard' && !alreadyConcession)
            }
          >
            {mutation.isPending ? 'Saving...' : 'Save plan'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
