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
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { Checkbox } from '#/components/ui/checkbox'
import { TableDateRangePicker } from './data-table/TableDateRangePicker'
import { TableFilters } from './data-table/TableFilters'
import { TablePagination } from './data-table/TablePagination'
import { usePersistedPageSize, useDateRangeFilter } from './data-table/hooks'
import type { DataTableProps } from './data-table/types'

export type { FilterConfig, DataTableProps } from './data-table/types'

type RowWithId = { id?: number | string }

function createSelectionColumn<TData, TValue>(): ColumnDef<TData, TValue> {
  return {
    id: '__select',
    enableSorting: false,
    enableColumnFilter: false,
    header: ({ table: t }) => (
      <Checkbox
        aria-label="Select all rows"
        checked={
          t.getIsAllPageRowsSelected()
            ? true
            : t.getIsSomePageRowsSelected()
              ? 'indeterminate'
              : false
        }
        onCheckedChange={(checked) =>
          t.toggleAllPageRowsSelected(checked === true)
        }
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        aria-label="Select row"
        checked={row.getIsSelected()}
        onCheckedChange={(checked) => row.toggleSelected(checked === true)}
        onClick={(e) => e.stopPropagation()}
      />
    ),
  }
}

export function CustomDataTable<TData, TValue>(
  props: DataTableProps<TData, TValue>,
) {
  const {
    columns,
    data,
    tableTitle,
    pgSize,
    filters = [],
    defaultFilters,
    filtersExtras,
    summarySlot,
    showDatePicker,
    dateField,
    datePickerExtras,
    tableId,
    enableSelection,
    onSelectionChange,
    onFilteredRowsChange,
  } = props

  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    defaultFilters ?? [],
  )
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState({})

  const { filteredData, dateRange, setDateRange } = useDateRangeFilter(
    data,
    dateField,
    !!showDatePicker,
  )

  const [pageSize, setPageSizeFromUser] = usePersistedPageSize(
    tableId,
    pgSize || 10,
  )

  const [pageIndex, setPageIndex] = React.useState(0)

  React.useEffect(() => {
    setPageIndex(0)
  }, [dateRange, columnFilters])

  const pagination: PaginationState = React.useMemo(
    () => ({ pageIndex, pageSize }),
    [pageIndex, pageSize],
  )

  const handlePaginationChange = React.useCallback(
    (
      updater: PaginationState | ((prev: PaginationState) => PaginationState),
    ) => {
      const next =
        typeof updater === 'function'
          ? updater({ pageIndex, pageSize })
          : updater
      setPageIndex(next.pageIndex)
      if (next.pageSize !== pageSize) setPageSizeFromUser(next.pageSize)
    },
    [pageIndex, pageSize, setPageSizeFromUser],
  )

  if (import.meta.env.DEV && enableSelection && data.length > 0) {
    const hasId = (data[0] as RowWithId).id !== undefined
    if (!hasId) {
      console.warn(
        'CustomDataTable: enableSelection requires each row to have a unique `id`; selection state will collide.',
      )
    }
  }

  const resolvedColumns = React.useMemo(
    () =>
      enableSelection
        ? [createSelectionColumn<TData, TValue>(), ...columns]
        : columns,
    [columns, enableSelection],
  )

  const table = useReactTable({
    data: filteredData,
    columns: resolvedColumns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    getRowId: enableSelection
      ? (row) => String((row as RowWithId).id ?? '')
      : undefined,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: handlePaginationChange,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      pagination,
    },
  })

  const filteredDataRef = React.useRef(filteredData)
  filteredDataRef.current = filteredData
  const onSelectionChangeRef = React.useRef(onSelectionChange)
  onSelectionChangeRef.current = onSelectionChange

  React.useEffect(() => {
    const cb = onSelectionChangeRef.current
    if (!cb) return
    const selected = filteredDataRef.current.filter(
      (row) =>
        (rowSelection as Record<string, boolean>)[
          String((row as RowWithId).id ?? '')
        ] === true,
    )
    cb(selected)
  }, [rowSelection])

  const filteredRowsForParent = React.useMemo(
    () => table.getFilteredRowModel().rows.map((r) => r.original),
    // Re-compute whenever column filters or source data change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [table, columnFilters, filteredData],
  )

  const onFilteredRowsChangeRef = React.useRef(onFilteredRowsChange)
  onFilteredRowsChangeRef.current = onFilteredRowsChange

  React.useEffect(() => {
    onFilteredRowsChangeRef.current?.(filteredRowsForParent)
  }, [filteredRowsForParent])

  return (
    <div className="overflow-x-auto sm:overflow-visible">
      {tableTitle && (
        <h3 className="mb-5 text-lg font-semibold">{tableTitle}</h3>
      )}

      {showDatePicker && (
        <div className="my-2 flex flex-wrap items-end gap-4">
          <TableDateRangePicker
            value={dateRange}
            onChange={setDateRange}
            onReset={() => setDateRange(undefined)}
          />
          {datePickerExtras}
        </div>
      )}

      <TableFilters table={table} filters={filters} extras={filtersExtras} />

      {summarySlot}

      <div className="rounded-lg bg-muted p-1">
        <div className="overflow-x-auto">
          <Table className="min-w-full">
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    if (header.isPlaceholder) {
                      return <TableHead key={header.id} />
                    }
                    const canSort = header.column.getCanSort()
                    const sorted = header.column.getIsSorted()
                    const content = flexRender(
                      header.column.columnDef.header,
                      header.getContext(),
                    )
                    return (
                      <TableHead key={header.id}>
                        {canSort ? (
                          <button
                            type="button"
                            onClick={header.column.getToggleSortingHandler()}
                            className="flex items-center gap-1 hover:text-foreground"
                          >
                            {content}
                            {sorted === 'asc' ? (
                              <ArrowUp className="size-3" />
                            ) : sorted === 'desc' ? (
                              <ArrowDown className="size-3" />
                            ) : (
                              <ArrowUpDown className="size-3 opacity-40" />
                            )}
                          </button>
                        ) : (
                          content
                        )}
                      </TableHead>
                    )
                  })}
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
                    colSpan={resolvedColumns.length}
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

      <TablePagination
        table={table}
        totalRows={filteredData.length}
        pageSize={pageSize}
        onPageSizeChange={setPageSizeFromUser}
      />
    </div>
  )
}
