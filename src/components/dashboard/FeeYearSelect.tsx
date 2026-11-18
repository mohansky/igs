import { useMemo, useState } from 'react'
import { Label } from '#/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import {
  ALL_YEARS,
  defaultFeeYear,
  feeYears,
  filterFeesByYear,
} from '#/lib/fee-years'

// Academic-year filter state for a fee list: opens on the current year
// (or the latest year with fees) until the user picks one.
export function useFeeYear<T extends { dueDate: string }>(fees: T[]) {
  const [picked, setPicked] = useState<string | null>(null)
  const years = useMemo(() => feeYears(fees), [fees])
  const year = picked ?? defaultFeeYear(years)
  const yearFees = useMemo(() => filterFeesByYear(fees, year), [fees, year])
  return { year, setYear: setPicked, years, yearFees }
}

export function FeeYearSelect({
  year,
  years,
  onChange,
}: {
  year: string
  years: string[]
  onChange: (year: string) => void
}) {
  // Keep the selected year listed even when it has no fees yet.
  const options =
    years.includes(year) || year === ALL_YEARS ? years : [year, ...years]

  return (
    <div className="flex items-center gap-2">
      <Label htmlFor="fee-year" className="shrink-0">
        Academic year
      </Label>
      <Select value={year} onValueChange={onChange}>
        <SelectTrigger id="fee-year" className="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_YEARS}>All years</SelectItem>
          {options.map((y) => (
            <SelectItem key={y} value={y} className="font-mono">
              {y}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
