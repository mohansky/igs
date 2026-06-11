import type { ClassValue } from 'clsx'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { getDateFormat } from './preferences'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Format a number as INR currency with no fraction digits */
export function formatCurrency(value: number | null | undefined): string {
  return (value ?? 0).toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}

const MONTH_ABBR = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

/** Format a date string (YYYY-MM-DD or ISO) using the user's preferred format */
export function formatDate(value: string | null | undefined): string {
  if (!value) return '-'
  const d = new Date(value)
  if (isNaN(d.getTime())) return value
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  const yy = String(yyyy).slice(-2)
  const mmm = MONTH_ABBR[d.getMonth()]
  switch (getDateFormat()) {
    case 'dd/MM/yyyy':
      return `${dd}/${mm}/${yyyy}`
    case 'dd-MM-yy':
      return `${dd}-${mm}-${yy}`
    case 'dd MMM yyyy':
      return `${dd} ${mmm} ${yyyy}`
    default:
      return `${dd}-${mm}-${yyyy}`
  }
}
