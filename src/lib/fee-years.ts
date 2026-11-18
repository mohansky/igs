// Academic-year filter for fee lists. A fee belongs to the school year
// (May–April) its due date falls in, the same rule the Fee Summary tab uses.
// Concession fees are dated on the first day of their year, so they land in
// the right year too.

import {
  academicYearLabel,
  currentAcademicYear,
  fyStartYearOf,
} from './financial-year'

export const ALL_YEARS = 'all'

export function feeAcademicYear(dueDate: string): string {
  return academicYearLabel(fyStartYearOf(dueDate))
}

// Years that have fees, most recent first.
export function feeYears(fees: { dueDate: string }[]): string[] {
  return [...new Set(fees.map((f) => feeAcademicYear(f.dueDate)))].sort(
    (a, b) => b.localeCompare(a),
  )
}

// Open on the current year; if it has no fees yet (e.g. a student who left
// last year), the most recent year that has some.
export function defaultFeeYear(
  years: string[],
  current: string = currentAcademicYear(),
): string {
  if (years.length === 0 || years.includes(current)) return current
  return years[0]
}

export function filterFeesByYear<T extends { dueDate: string }>(
  fees: T[],
  year: string,
): T[] {
  if (year === ALL_YEARS) return fees
  return fees.filter((f) => feeAcademicYear(f.dueDate) === year)
}
