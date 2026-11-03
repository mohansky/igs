import { useQuery } from '@tanstack/react-query'
import { listFeeCategories } from '#/server/fee-categories'

export const feeCategoriesQuery = {
  queryKey: ['fee-categories'],
  queryFn: () => listFeeCategories(),
}

const selectClass =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'

// Dropdown of active fee categories (admin dialogs). `currentId` keeps an
// existing fee's category listed even if it has since been deactivated.
export function FeeCategorySelect({
  id,
  value,
  onChange,
  currentId,
  required,
  placeholder = 'Select category',
  enabled = true,
}: {
  id?: string
  value: string
  onChange: (value: string) => void
  currentId?: number | null
  required?: boolean
  placeholder?: string
  enabled?: boolean
}) {
  const { data: categories = [] } = useQuery({
    ...feeCategoriesQuery,
    enabled,
  })
  const options = categories.filter((c) => c.isActive || c.id === currentId)

  return (
    <select
      id={id}
      className={selectClass}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required={required}
    >
      <option value="" disabled>
        {placeholder}
      </option>
      {options.map((c) => (
        <option key={c.id} value={String(c.id)}>
          {c.name}
          {c.isActive ? '' : ' (inactive)'}
        </option>
      ))}
    </select>
  )
}
