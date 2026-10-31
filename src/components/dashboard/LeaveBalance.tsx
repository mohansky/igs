import { format, parseISO } from 'date-fns'
import { cn } from '#/lib/utils'
import type { LeavePolicy } from '#/lib/leave-policy'
import type { LeaveUsed } from '#/server/staff-attendance'

export function leaveWindowLabel(policy: LeavePolicy) {
  return `${format(parseISO(policy.from), 'd MMM yyyy')} – ${format(parseISO(policy.to), 'd MMM yyyy')}`
}

function Line({
  label,
  used,
  allowed,
}: {
  label: string
  used: number
  allowed: number
}) {
  const left = allowed - used
  const pct = Math.min(100, allowed > 0 ? (used / allowed) * 100 : 0)
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="font-medium">{label}</span>
        <span className={cn(left < 0 && 'font-semibold text-destructive')}>
          {used} of {allowed} used ·{' '}
          {left < 0 ? `${-left} over` : `${left} left`}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            'h-full rounded-full',
            left < 0 ? 'bg-destructive' : 'bg-primary',
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

// Full breakdown: casual + sick bars, plus a nudge for untyped leave days.
export function LeaveBalance({
  policy,
  used,
}: {
  policy: LeavePolicy
  used?: LeaveUsed
}) {
  const casual = used?.casual ?? 0
  const sick = used?.sick ?? 0
  const unspecified = used?.unspecified ?? 0
  return (
    <div className="space-y-3">
      <Line label="Casual leave" used={casual} allowed={policy.casual} />
      <Line label="Sick leave" used={sick} allowed={policy.sick} />
      {unspecified > 0 && (
        <p className="text-xs text-amber-600">
          {unspecified} leave day{unspecified === 1 ? '' : 's'} with no type
          recorded — not counted above. Mark them as casual or sick on the
          Staff Attendance page.
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        {leaveWindowLabel(policy)}. Absent days don&apos;t count against
        leave.
      </p>
    </div>
  )
}

// One-line version for tables: "CL 3/8 · SL 1/6".
export function LeaveBalanceCompact({
  policy,
  used,
}: {
  policy: LeavePolicy
  used?: LeaveUsed
}) {
  const casual = used?.casual ?? 0
  const sick = used?.sick ?? 0
  const unspecified = used?.unspecified ?? 0
  return (
    <span className="whitespace-nowrap text-xs text-muted-foreground">
      <span className={cn(casual > policy.casual && 'font-semibold text-destructive')}>
        CL {casual}/{policy.casual}
      </span>
      {' · '}
      <span className={cn(sick > policy.sick && 'font-semibold text-destructive')}>
        SL {sick}/{policy.sick}
      </span>
      {unspecified > 0 && (
        <span className="text-amber-600" title="Leave days with no type">
          {' · '}?{unspecified}
        </span>
      )}
    </span>
  )
}
