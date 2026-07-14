// Pure fee arithmetic, extracted from the server handlers so it can be tested
// without a database.

// Amounts are stored as SQLite REAL, so compare with a sub-paisa tolerance
// rather than exact equality.
export const AMOUNT_EPSILON = 0.005

export type FeeStatus = 'pending' | 'partial' | 'paid'

/** Derive a fee's status from the total paid against it. */
export function deriveFeeStatus(paidAmount: number, amount: number): FeeStatus {
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
