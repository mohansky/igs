// The school's financial year runs 1 May – 30 April, so May expenses
// belong to the new academic year. A year is identified by its start
// year: FY 2025 = 1 May 2025 – 30 Apr 2026.

export const FY_START_MONTH = 5

export function fyStartYearOf(date: string): number {
  const year = Number(date.slice(0, 4))
  const month = Number(date.slice(5, 7))
  return month >= FY_START_MONTH ? year : year - 1
}

export function currentFyStartYear(): number {
  const now = new Date()
  return now.getMonth() + 1 >= FY_START_MONTH
    ? now.getFullYear()
    : now.getFullYear() - 1
}

export function fyStartDate(startYear: number): string {
  return `${startYear}-05-01`
}

export function fyEndDate(startYear: number): string {
  return `${startYear + 1}-04-30`
}

export function fyLabel(startYear: number): string {
  return `FY ${startYear}–${String(startYear + 1).slice(2)}`
}

// The academic year shares the FY boundary (starts in May), and is stored on
// classes as e.g. "2025-26".
export function academicYearLabel(startYear: number): string {
  return `${startYear}-${String(startYear + 1).slice(2)}`
}

export function currentAcademicYear(): string {
  return academicYearLabel(currentFyStartYear())
}

export function fyRangeLabel(startYear: number): string {
  return `May ${startYear} – Apr ${startYear + 1}`
}
