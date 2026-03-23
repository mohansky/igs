import * as React from 'react'
import {
  type ColumnDef,
  type ColumnFiltersState,
  type PaginationState,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { Button } from '#/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import type { DateRange } from 'react-day-picker'
import {
  isWithinInterval,
  parseISO,
  endOfDay,
  startOfDay,
  isValid,
  format,
} from 'date-fns'
import { Calendar as CalendarIcon } from 'lucide-react'
import { cn } from '#/lib/utils'
import { Calendar } from '#/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '#/components/ui/popover'
import { Input } from '#/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { Label } from '../ui/label'

interface FilterConfig {
  column: string
  placeholder: string
  label?: string
  type?: 'text' | 'select'
  options?: Array<{ label: string; value: string }>
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  tableTitle?: string
  pgSize?: number
  filters?: FilterConfig[]
  showDatePicker?: boolean
  dateField?: keyof TData
}

type DateInput = Date | string | number

const parseDateSafely = (
  dateValue: DateInput | null | undefined,
): Date | null => {
  if (!dateValue) return null

  if (dateValue instanceof Date) {
    return isValid(dateValue) ? dateValue : null
  }

  if (typeof dateValue === 'string') {
    try {
      const parsedDate = parseISO(dateValue)
      return isValid(parsedDate) ? parsedDate : null
    } catch {
      return null
    }
  }

  if (typeof dateValue === 'number') {
    const date = new Date(dateValue)
    return isValid(date) ? date : null
  }

  return null
}

export function CustomDataTable<TData, TValue>({
  columns,
  data,
  tableTitle,
  pgSize,
  filters = [],
  showDatePicker,
  dateField = 'date' as keyof TData,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] =
    React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState({})
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>()
  const [filteredData, setFilteredData] = React.useState(data)

  const [{ pageIndex, pageSize }, setPagination] =
    React.useState<PaginationState>({
      pageIndex: 0,
      pageSize: pgSize || 10,
    })

  const pagination = React.useMemo(
    () => ({ pageIndex, pageSize }),
    [pageIndex, pageSize],
  )

  React.useEffect(() => {
    if (!dateRange?.from || !dateRange?.to) {
      setFilteredData(data)
      return
    }

    const filtered = data.filter((item: TData) => {
      const itemDate = parseDateSafely(item[dateField] as DateInput)
      if (!itemDate) return false

      return isWithinInterval(itemDate, {
        start: startOfDay(dateRange.from!),
        end: endOfDay(dateRange.to!),
      })
    })

    setFilteredData(filtered)
  }, [dateRange, data, dateField])

  const handleDateRangeSelect = (newDateRange: DateRange | undefined) => {
    setDateRange(newDateRange)
    setPagination((prev) => ({ ...prev, pageIndex: 0 }))
  }

  const [filterCounts, setFilterCounts] = React.useState<
    Record<string, number>
  >({})

  React.useEffect(() => {
    const counts: Record<string, number> = {}

    columnFilters.forEach((filter) => {
      if (filter.value && String(filter.value).trim() !== '') {
        const filteredCount = data.filter((item) => {
          const itemValue = item[filter.id as keyof TData]
          if (itemValue === null || itemValue === undefined) return false
          return String(itemValue)
            .toLowerCase()
            .includes(String(filter.value).toLowerCase())
        }).length

        counts[filter.id] = filteredCount
      }
    })

    if (dateRange?.from && dateRange?.to) {
      const dateFilteredCount = data.filter((item: TData) => {
        const itemDate = parseDateSafely(item[dateField] as DateInput)
        if (!itemDate) return false
        return isWithinInterval(itemDate, {
          start: startOfDay(dateRange.from!),
          end: endOfDay(dateRange.to!),
        })
      }).length
      counts['dateRange'] = dateFilteredCount
    }

    setFilterCounts(counts)
  }, [columnFilters, dateRange, data, dateField])

  const table = useReactTable({
    data: filteredData,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      pagination,
    },
  })

  return (
    <div className="overflow-x-auto sm:overflow-visible">
      {tableTitle && (
        <h3 className="mb-5 text-lg font-semibold">{tableTitle}</h3>
      )}

      {showDatePicker && (
        <div className="my-2 flex items-center gap-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="date"
                variant="outline"
                className={cn(
                  'w-64 justify-start text-left font-normal',
                  !dateRange && 'text-muted-foreground',
                )}
              >
                <CalendarIcon className="mr-2 size-4" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, 'dd-MM-yyyy')} -{' '}
                      {format(dateRange.to, 'dd-MM-yyyy')}
                    </>
                  ) : (
                    format(dateRange.from, 'dd-MM-yyyy')
                  )
                ) : (
                  <span>Pick a date range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={handleDateRangeSelect}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
          <Button
            size="sm"
            onClick={() => {
              setDateRange(undefined)
              setFilteredData(data)
            }}
          >
            Reset Dates
          </Button>
        </div>
      )}

      {filters.length > 0 && (
        <div className="my-2 flex flex-wrap items-start gap-4">
          {filters.map((filter) => (
            <div key={filter.column} className="flex min-h-14 flex-col gap-1">
              {filter.label && (
                <Label htmlFor={filter.column}>
                  {filter.label}
                </Label>
              )}
              {filter.type === 'select' && filter.options ? (
                <Select
                  value={
                    (table
                      .getColumn(filter.column)
                      ?.getFilterValue() as string) ?? 'all'
                  }
                  onValueChange={(value) =>
                    table
                      .getColumn(filter.column)
                      ?.setFilterValue(value === 'all' ? '' : value)
                  }
                >
                  <SelectTrigger className="w-52">
                    <SelectValue placeholder={filter.placeholder} />
                  </SelectTrigger>
                  <SelectContent>
                    {filter.options.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  placeholder={filter.placeholder}
                  value={
                    (table
                      .getColumn(filter.column)
                      ?.getFilterValue() as string) ?? ''
                  }
                  onChange={(event) =>
                    table
                      .getColumn(filter.column)
                      ?.setFilterValue(event.target.value)
                  }
                  className="max-w-xs"
                />
              )}
              {filterCounts[filter.column] !== undefined && (
                <div className="pl-2 text-xs text-muted-foreground">
                  {filterCounts[filter.column]} matches
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="rounded-lg bg-muted p-1">
        <div className="overflow-x-auto">
          <Table className="min-w-full">
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && 'selected'}
                    className="even:bg-muted/50"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    No data available.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
            <TableFooter>
              {table.getFooterGroups().map((footerGroup) => (
                <TableRow key={footerGroup.id}>
                  {footerGroup.headers.map((header) => (
                    <TableCell key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.footer,
                            header.getContext(),
                          )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableFooter>
          </Table>
        </div>
      </div>

      <div className="flex items-center justify-between space-x-2 py-4">
        <div className="text-sm text-muted-foreground">
          Showing {table.getFilteredRowModel().rows.length} of{' '}
          {filteredData.length} records
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Rows</span>
            <Select
              value={String(pageSize)}
              onValueChange={(value) =>
                setPagination({ pageIndex: 0, pageSize: Number(value) })
              }
            >
              <SelectTrigger className="h-8 w-18">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[10, 20, 50].map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CustomDataTable
