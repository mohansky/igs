import { fyEndDate, fyStartDate } from './financial-year'

// Staff leave allowance. The leave year is the school year (1 May – 30 Apr),
// identified by its start year like the financial year.
//
// The allowance system started on 1 Oct 2026. Leave marked before that was
// under the old rules (more than 2 days off in a month = loss of pay) and is
// not counted against anything.
export const LEAVE_POLICY_START = '2026-10-01'

export const LEAVE_TYPES = ['casual', 'sick'] as const
export type LeaveType = (typeof LEAVE_TYPES)[number]

export const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  casual: 'Casual',
  sick: 'Sick',
}

// "Casual leave" / "Sick leave" / "leave (no type)"; other statuses as-is.
export function attendanceStatusLabel(
  status: string,
  leaveType?: string | null,
) {
  if (status !== 'leave') return status
  return leaveType === 'casual' || leaveType === 'sick'
    ? `${LEAVE_TYPE_LABELS[leaveType]} leave`
    : 'leave (no type)'
}

export interface LeavePolicy {
  year: number
  from: string // YYYY-MM-DD, inclusive
  to: string // YYYY-MM-DD, inclusive
  casual: number
  sick: number
}

// null for school years before the allowance system existed.
export function leavePolicyFor(year: number): LeavePolicy | null {
  const to = fyEndDate(year)
  if (to < LEAVE_POLICY_START) return null
  const start = fyStartDate(year)
  return {
    year,
    from: start > LEAVE_POLICY_START ? start : LEAVE_POLICY_START,
    to,
    // 2026-27 began part-way through (October), so 8 casual instead of 12.
    casual: year === 2026 ? 8 : 12,
    sick: 6,
  }
}
