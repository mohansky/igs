import * as React from 'react'
import type { Column, Table } from '@tanstack/react-table'
import { CheckIcon, ChevronsUpDownIcon } from 'lucide-react'
import { Button } from '#/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '#/components/ui/command'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '#/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { cn } from '#/lib/utils'
import type { FilterConfig } from './types'

interface TableFiltersProps<TData> {
  table: Table<TData>
  filters: FilterConfig[]
  extras?: React.ReactNode
}

export function TableFilters<TData>({
  table,
  filters,
  extras,
}: TableFiltersProps<TData>) {
  if (filters.length === 0 && !extras) return null

  return (
    <div className="my-2 grid grid-cols-2 items-end gap-3 sm:flex sm:flex-wrap sm:gap-4">
      {filters.map((filter) => {
        const column = table.getColumn(filter.column)
        const current = (column?.getFilterValue() as string) ?? ''

        return (
          <div key={filter.column} className="flex min-h-14 flex-col gap-1">
            {filter.label && (
              <Label htmlFor={filter.column}>{filter.label}</Label>
            )}
            {filter.type === 'combobox' && filter.options ? (
              <ComboboxFilter
                column={column}
                current={current}
                filter={filter}
              />
            ) : filter.type === 'select' && filter.options ? (
              <Select
                value={current || 'all'}
                onValueChange={(value) =>
                  column?.setFilterValue(value === 'all' ? '' : value)
                }
              >
                <SelectTrigger className="w-full sm:w-52">
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
                id={filter.column}
                placeholder={filter.placeholder}
                value={current}
                onChange={(event) => column?.setFilterValue(event.target.value)}
                className="w-full sm:max-w-xs"
              />
            )}
          </div>
        )
      })}
      {extras && (
        <div className="col-span-2 flex min-h-14 items-end sm:col-auto">
          {extras}
        </div>
      )}
    </div>
  )
}

interface ComboboxFilterProps<TData> {
  column: Column<TData, unknown> | undefined
  current: string
  filter: FilterConfig
}

function ComboboxFilter<TData>({
  column,
  current,
  filter,
}: ComboboxFilterProps<TData>) {
  const [open, setOpen] = React.useState(false)
  const options = filter.options ?? []
  const selected = options.find((o) => o.value === current)
  const triggerLabel = selected ? selected.label : filter.placeholder

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={filter.column}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'w-full justify-between font-normal sm:w-52',
            !selected && 'text-muted-foreground',
          )}
        >
          {triggerLabel}
          <ChevronsUpDownIcon className="size-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0"
        align="start"
      >
        <Command>
          <CommandInput placeholder={filter.placeholder} />
          <CommandList>
            <CommandEmpty>{filter.emptyText ?? 'No results.'}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const isClear = option.value === '' || option.value === 'all'
                const isSelected = current === option.value
                return (
                  <CommandItem
                    key={option.value}
                    value={`${option.label} ${option.value}`}
                    onSelect={() => {
                      column?.setFilterValue(isClear ? '' : option.value)
                      setOpen(false)
                    }}
                  >
                    <CheckIcon
                      className={cn(
                        'size-4',
                        isSelected ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                    {option.label}
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
