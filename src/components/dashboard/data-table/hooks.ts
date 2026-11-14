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
    if (!enabled || !dateField || !dateRange?.from || !dateRange.to) {
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

// Click-and-drag sideways scrolling for a wide table with a mouse, so you
// don't have to reach the scrollbar at the bottom. Touch already pans
// natively, so only mouse pointers are handled. A drag starts after 5px of
// movement; starting on a link, button, input or checkbox is left alone,
// and the click that ends a drag is swallowed so a row action doesn't fire.
// Attach the ref to a wrapper; it scrolls the shadcn table container inside
// it (or the wrapper itself if there isn't one). The wrapper gets
// data-scrollable / data-dragging for the grab cursors.
const DRAG_THRESHOLD_PX = 5
const NO_DRAG_SELECTOR =
  'a, button, input, select, textarea, label, [role="checkbox"], [role="combobox"], [role="menuitem"], [contenteditable="true"], [data-no-drag-scroll]'

export function useDragScroll<T extends HTMLElement>() {
  const ref = React.useRef<T>(null)

  React.useEffect(() => {
    const wrapper = ref.current
    if (!wrapper) return
    const scroller = () =>
      wrapper.querySelector<HTMLElement>('[data-slot="table-container"]') ??
      wrapper

    // Grab cursor only when there's something to scroll.
    const updateScrollable = () => {
      const el = scroller()
      wrapper.dataset.scrollable = String(el.scrollWidth > el.clientWidth + 1)
    }
    const resize = new ResizeObserver(updateScrollable)
    resize.observe(wrapper)
    const table = wrapper.querySelector('table')
    if (table) resize.observe(table)
    updateScrollable()

    let pointerId: number | null = null
    let startX = 0
    let startLeft = 0
    let dragging = false
    let swallowClick = false

    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return
      if ((e.target as Element | null)?.closest(NO_DRAG_SELECTOR)) return
      const el = scroller()
      if (el.scrollWidth <= el.clientWidth + 1) return
      pointerId = e.pointerId
      startX = e.clientX
      startLeft = el.scrollLeft
      dragging = false
    }
    const onMove = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return
      const dx = e.clientX - startX
      if (!dragging) {
        if (Math.abs(dx) < DRAG_THRESHOLD_PX) return
        dragging = true
        wrapper.setPointerCapture(e.pointerId)
        wrapper.dataset.dragging = 'true'
        // Drop any text selection started before the threshold.
        window.getSelection()?.removeAllRanges()
      }
      scroller().scrollLeft = startLeft - dx
      e.preventDefault()
    }
    const onEnd = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return
      pointerId = null
      if (wrapper.hasPointerCapture(e.pointerId)) {
        wrapper.releasePointerCapture(e.pointerId)
      }
      delete wrapper.dataset.dragging
      if (dragging) {
        swallowClick = true
        // In case no click event follows (released outside the wrapper).
        setTimeout(() => (swallowClick = false), 0)
      }
      dragging = false
    }
    const onClick = (e: MouseEvent) => {
      if (!swallowClick) return
      swallowClick = false
      e.preventDefault()
      e.stopPropagation()
    }

    wrapper.addEventListener('pointerdown', onDown)
    wrapper.addEventListener('pointermove', onMove)
    wrapper.addEventListener('pointerup', onEnd)
    wrapper.addEventListener('pointercancel', onEnd)
    wrapper.addEventListener('click', onClick, true)
    return () => {
      resize.disconnect()
      wrapper.removeEventListener('pointerdown', onDown)
      wrapper.removeEventListener('pointermove', onMove)
      wrapper.removeEventListener('pointerup', onEnd)
      wrapper.removeEventListener('pointercancel', onEnd)
      wrapper.removeEventListener('click', onClick, true)
    }
  }, [])

  return ref
}
