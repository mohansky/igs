import { Card } from '#/components/ui/card'
import { Skeleton } from '#/components/ui/skeleton'
import { cn } from '#/lib/utils'

// A compact summary tile for the row of totals above a table: the shared
// Card's py-6 / gap-6 is too tall for that.
export function StatCard({
  label,
  value,
  note,
  valueClassName,
}: {
  label: string
  value: string
  note?: React.ReactNode
  valueClassName?: string
}) {
  return (
    <Card className="gap-0.5 px-4 py-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className={cn('truncate text-lg font-bold', valueClassName)}>
        {value}
      </p>
      {note && <p className="text-xs text-muted-foreground">{note}</p>}
    </Card>
  )
}

export function StatCardSkeleton() {
  return (
    <Card className="gap-1.5 px-4 py-3">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-6 w-28" />
    </Card>
  )
}
