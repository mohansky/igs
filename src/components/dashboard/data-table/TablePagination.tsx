import type { Table } from '@tanstack/react-table'
import { Button } from '#/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import NextIcon from '#/components/icons/NextIcon'
import PrevIcon from '#/components/icons/PrevIcon'

interface TablePaginationProps<TData> {
  table: Table<TData>
  totalRows: number
  pageSize: number
  onPageSizeChange: (next: number) => void
}

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100]

export function TablePagination<TData>({
  table,
  totalRows,
  pageSize,
  onPageSizeChange,
}: TablePaginationProps<TData>) {
  return (
    <div className="flex items-center justify-between space-x-2 py-4">
      <div className="text-sm text-muted-foreground">
        Showing {table.getFilteredRowModel().rows.length} of {totalRows} records
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Rows</span>
          <Select
            value={String(pageSize)}
            onValueChange={(value) => onPageSizeChange(Number(value))}
          >
            <SelectTrigger className="h-8 w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((size) => (
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
            <PrevIcon size={16} />
            <span className="sr-only">Previous</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <NextIcon size={16} />
            <span className="sr-only">Next</span>
          </Button>
        </div>
      </div>
    </div>
  )
}
