import { describe, expect, it } from 'vitest'
import {
  deriveFeeStatus,
  outstandingBalance,
  validatePayment,
} from './fee-math'

describe('deriveFeeStatus', () => {
  it('is pending when nothing is paid', () => {
    expect(deriveFeeStatus(0, 5000)).toBe('pending')
  })

  it('is partial when some is paid', () => {
    expect(deriveFeeStatus(2000, 5000)).toBe('partial')
  })

  it('is paid when the full amount is paid', () => {
    expect(deriveFeeStatus(5000, 5000)).toBe('paid')
  })

  it('is paid when overpaid', () => {
    expect(deriveFeeStatus(6000, 5000)).toBe('paid')
  })

  // Floating-point: 0.1 + 0.2 !== 0.3. Without the epsilon a fee paid off in
  // instalments could get stuck on "partial" forever.
  it('treats a float-rounded full payment as paid, not partial', () => {
    const amount = 0.3
    const paid = 0.1 + 0.2 // 0.30000000000000004
    expect(deriveFeeStatus(paid, amount)).toBe('paid')

    const amount2 = 100
    const paid2 = 33.33 + 33.33 + 33.34 // 99.99999999999999
    expect(deriveFeeStatus(paid2, amount2)).toBe('paid')
  })

  it('does not call a nearly-paid fee paid', () => {
    expect(deriveFeeStatus(4999, 5000)).toBe('partial')
  })
})

describe('outstandingBalance', () => {
  it('subtracts what has been paid', () => {
    expect(outstandingBalance(5000, 2000)).toBe(3000)
  })

  it('treats a null paidAmount as zero', () => {
    expect(outstandingBalance(5000, null)).toBe(5000)
    expect(outstandingBalance(5000, undefined)).toBe(5000)
  })

  it('never goes negative on an overpaid fee', () => {
    expect(outstandingBalance(5000, 6000)).toBe(0)
  })
})

describe('validatePayment', () => {
  it('accepts a payment within the balance', () => {
    expect(validatePayment(2000, 5000, 0)).toBeNull()
  })

  it('accepts a payment that exactly settles the balance', () => {
    expect(validatePayment(3000, 5000, 2000)).toBeNull()
  })

  it('rejects a payment larger than the outstanding balance', () => {
    expect(validatePayment(50_000, 5000, 0)).toMatch(/exceeds the outstanding/)
  })

  it('rejects overpaying the remainder of a partially paid fee', () => {
    // ₹2,000 already paid on ₹5,000 — ₹4,000 more would overshoot.
    expect(validatePayment(4000, 5000, 2000)).toMatch(/exceeds the outstanding/)
  })

  it('rejects any payment against an already-paid fee', () => {
    expect(validatePayment(1, 5000, 5000)).toBe(
      'This fee is already fully paid.',
    )
  })

  it('tolerates sub-paisa float error rather than rejecting a valid payment', () => {
    // Settling 0.3 with 0.1 + 0.2 must not trip the overpayment guard.
    expect(validatePayment(0.1 + 0.2, 0.3, 0)).toBeNull()
  })
})
