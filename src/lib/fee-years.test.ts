import { describe, expect, it } from 'vitest'
import {
  ALL_YEARS,
  defaultFeeYear,
  feeAcademicYear,
  feeYears,
  filterFeesByYear,
} from './fee-years'

describe('feeAcademicYear', () => {
  it('puts May–April in one school year', () => {
    expect(feeAcademicYear('2026-05-01')).toBe('2026-27')
    expect(feeAcademicYear('2026-12-15')).toBe('2026-27')
    expect(feeAcademicYear('2027-04-30')).toBe('2026-27')
    expect(feeAcademicYear('2026-04-30')).toBe('2025-26')
  })
})

describe('feeYears', () => {
  it('lists distinct years, most recent first', () => {
    expect(
      feeYears([
        { dueDate: '2025-06-10' },
        { dueDate: '2026-07-01' },
        { dueDate: '2026-03-01' },
      ]),
    ).toEqual(['2026-27', '2025-26'])
  })
})

describe('defaultFeeYear', () => {
  it('prefers the current year, else the latest with fees', () => {
    expect(defaultFeeYear(['2026-27', '2025-26'], '2026-27')).toBe('2026-27')
    expect(defaultFeeYear(['2025-26', '2024-25'], '2026-27')).toBe('2025-26')
    expect(defaultFeeYear([], '2026-27')).toBe('2026-27')
  })
})

describe('filterFeesByYear', () => {
  const fees = [
    { id: 1, dueDate: '2026-05-01' },
    { id: 2, dueDate: '2026-04-10' },
    { id: 3, dueDate: '2027-01-05' },
  ]

  it('keeps only fees due in that school year', () => {
    expect(filterFeesByYear(fees, '2026-27').map((f) => f.id)).toEqual([1, 3])
    expect(filterFeesByYear(fees, '2025-26').map((f) => f.id)).toEqual([2])
  })

  it('returns everything for All years', () => {
    expect(filterFeesByYear(fees, ALL_YEARS)).toBe(fees)
  })
})
