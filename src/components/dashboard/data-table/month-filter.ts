import { format, parseISO } from 'date-fns'
import type { ColumnDef } from '@tanstack/react-table'

// A Month filter for tables of dated rows (YYYY-MM-DD): a hidden "month"
// column to filter on (pass hiddenColumns={['month']}), plus the select
// options for the months present in the data.

export const MONTH_COLUMN_ID = 'month'

export function monthColumn<T extends { date: string }>(): ColumnDef<T> {
  return {
    id: MONTH_COLUMN_ID,
    header: 'Month',
    accessorFn: (row) => row.date.slice(0, 7),
    filterFn: (row, id, value) =>
      !value || value === 'all' || row.getValue(id) === value,
  }
}

// "All months" plus each month in the data, newest first, e.g. "November 2026".
export function monthFilterOptions(dates: Iterable<string>) {
  const keys = new Set<string>()
  for (const d of dates) if (/^\d{4}-\d{2}/.test(d)) keys.add(d.slice(0, 7))
  return [
    { label: 'All months', value: 'all' },
    ...[...keys]
      .sort((a, b) => b.localeCompare(a))
      .map((k) => ({
        label: format(parseISO(`${k}-01`), 'MMMM yyyy'),
        value: k,
      })),
  ]
}
