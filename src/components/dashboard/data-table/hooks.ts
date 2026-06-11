import * as React from 'react'
import type { DateRange } from 'react-day-picker'
import {
  endOfDay,
  isValid,
  isWithinInterval,
  parseISO,
  startOfDay,
} from 'date-fns'
import { subscribeToPreferences } from '#/lib/preferences'

const PAGE_SIZE_STORAGE_PREFIX = 'cdt:pageSize:'
const GLOBAL_ROWS_PREF_KEY = 'prefs:rows'

function readGlobalPageSize(fallback: number) {
  if (typeof window === 'undefined') return fallback
  const global = Number(window.localStorage.getItem(GLOBAL_ROWS_PREF_KEY))
  return Number.isFinite(global) && global > 0 ? global : fallback
}

function readPerTablePageSize(key: string | undefined) {
  if (typeof window === 'undefined' || !key) return null
  const raw = window.localStorage.getItem(PAGE_SIZE_STORAGE_PREFIX + key)
  const parsed = raw ? Number(raw) : NaN
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function readStoredPageSize(key: string | undefined, fallback: number) {
  return readPerTablePageSize(key) ?? readGlobalPageSize(fallback)
}

export function usePersistedPageSize(
  tableId: string | undefined,
  defaultSize: number,
) {
  const [pageSize, setPageSize] = React.useState(() =>
    readStoredPageSize(tableId, defaultSize),
  )

  React.useEffect(() => {
    return subscribeToPreferences(() => {
      if (readPerTablePageSize(tableId) !== null) return
      setPageSize((prev) => {
        const next = readGlobalPageSize(defaultSize)
        return prev === next ? prev : next
      })
    })
  }, [tableId, defaultSize])

  const setPageSizeFromUser = React.useCallback(
    (next: number) => {
      setPageSize(next)
      if (tableId && typeof window !== 'undefined') {
        window.localStorage.setItem(
          PAGE_SIZE_STORAGE_PREFIX + tableId,
          String(next),
        )
      }
    },
    [tableId],
  )

  return [pageSize, setPageSizeFromUser] as const
}

type DateInput = Date | string | number

function parseDateSafely(dateValue: DateInput | null | undefined): Date | null {
  if (!dateValue) return null
  if (dateValue instanceof Date) return isValid(dateValue) ? dateValue : null
  if (typeof dateValue === 'string') {
    try {
      const parsed = parseISO(dateValue)
      return isValid(parsed) ? parsed : null
    } catch {
      return null
    }
  }
  if (typeof dateValue === 'number') {
    const d = new Date(dateValue)
    return isValid(d) ? d : null
  }
  return null
}

export function useDateRangeFilter<TData>(
  data: TData[],
  dateField: keyof TData | undefined,
  enabled: boolean,
) {
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>()

  const filteredData = React.useMemo(() => {
    if (!enabled || !dateField || !dateRange?.from || !dateRange?.to) {
      return data
    }
    const start = startOfDay(dateRange.from)
    const end = endOfDay(dateRange.to)
    return data.filter((item) => {
      const itemDate = parseDateSafely(item[dateField] as DateInput)
      if (!itemDate) return false
      return isWithinInterval(itemDate, { start, end })
    })
  }, [data, dateField, dateRange, enabled])

  return { filteredData, dateRange, setDateRange }
}
