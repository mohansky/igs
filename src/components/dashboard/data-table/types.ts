import type * as React from 'react'
import type { ColumnDef, ColumnFiltersState } from '@tanstack/react-table'

export interface FilterConfig {
  column: string
  placeholder: string
  label?: string
  type?: 'text' | 'select' | 'combobox'
  options?: Array<{ label: string; value: string }>
  emptyText?: string
}

type WithDatePicker<TData> = {
  showDatePicker: true
  dateField: keyof TData
  datePickerExtras?: React.ReactNode
}

type WithoutDatePicker = {
  showDatePicker?: false
  dateField?: never
  datePickerExtras?: never
}

type BaseProps<TData, TValue> = {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  tableTitle?: string
  pgSize?: number
  filters?: FilterConfig[]
  /** Initial column filter values, e.g. default a Year filter to the current year. */
  defaultFilters?: ColumnFiltersState
  filtersExtras?: React.ReactNode
  summarySlot?: React.ReactNode
  tableId?: string
  enableSelection?: boolean
  onSelectionChange?: (selected: TData[]) => void
  onFilteredRowsChange?: (rows: TData[]) => void
}

export type DataTableProps<TData, TValue> = BaseProps<TData, TValue> &
  (WithDatePicker<TData> | WithoutDatePicker)
