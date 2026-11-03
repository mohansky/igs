// Pure fee arithmetic, extracted from the server handlers so it can be tested
// without a database.

// Amounts are stored as SQLite REAL, so compare with a sub-paisa tolerance
// rather than exact equality.
export const AMOUNT_EPSILON = 0.005

// 'open' is only ever set for concession fees (fees.is_open) — it is never
// derived from amounts.
export type FeeStatus = 'pending' | 'partial' | 'paid' | 'open'

/**
 * Today's date (YYYY-MM-DD) at the school, in India time. The server runs in
 * UTC, which is still "yesterday" until 5:30 AM IST.
 */
export function schoolToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
  }).format(now)
}

/** Payments can be backdated but not dated in the future. */
export function validatePaymentDate(
  paidDate: string,
  today: string,
): string | null {
  return paidDate > today ? 'Payment date cannot be in the future.' : null
}

/** Derive a standard fee's status from the total paid against it. */
export function deriveFeeStatus(
  paidAmount: number,
  amount: number,
): Exclude<FeeStatus, 'open'> {
  if (paidAmount <= 0) return 'pending'
  if (paidAmount >= amount - AMOUNT_EPSILON) return 'paid'
  return 'partial'
}

/** What's still owed on a fee. Never negative. */
export function outstandingBalance(
  amount: number,
  paidAmount: number | null | undefined,
): number {
  return Math.max(0, amount - (paidAmount ?? 0))
}

/**
 * Guard a proposed payment against a fee. Returns an error message, or null if
 * the payment is acceptable.
 */
export function validatePayment(
  proposed: number,
  amount: number,
  paidAmount: number | null | undefined,
): string | null {
  const remaining = outstandingBalance(amount, paidAmount)
  if (remaining <= AMOUNT_EPSILON) {
    return 'This fee is already fully paid.'
  }
  if (proposed > remaining + AMOUNT_EPSILON) {
    return `Payment of ${proposed} exceeds the outstanding balance of ${remaining}.`
  }
  return null
}
