import type { DateRange } from 'react-day-picker'
import { format } from 'date-fns'
import { Calendar as CalendarIcon } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { Calendar } from '#/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '#/components/ui/popover'
import { cn } from '#/lib/utils'

interface TableDateRangePickerProps {
  value: DateRange | undefined
  onChange: (range: DateRange | undefined) => void
  onReset: () => void
}

export function TableDateRangePicker({
  value,
  onChange,
  onReset,
}: TableDateRangePickerProps) {
  return (
    <div className="flex items-center gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant="outline"
            className={cn(
              'w-auto justify-start text-left font-normal',
              !value && 'text-muted-foreground',
            )}
          >
            <CalendarIcon className="mr-2 size-4" />
            {value?.from ? (
              value.to ? (
                <>
                  {format(value.from, 'dd-MM-yyyy')} -{' '}
                  {format(value.to, 'dd-MM-yyyy')}
                </>
              ) : (
                format(value.from, 'dd-MM-yyyy')
              )
            ) : (
              <span>Pick a date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="range"
            defaultMonth={value?.from}
            selected={value}
            onSelect={onChange}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
      <Button size="sm" onClick={onReset}>
        Reset Dates
      </Button>
    </div>
  )
}
