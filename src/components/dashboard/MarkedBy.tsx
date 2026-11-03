import { format } from 'date-fns'

type When = Date | string | number | null | undefined

export function formatWhen(at: When) {
  return at ? format(new Date(at), 'd MMM yyyy, h:mm a') : ''
}

// "Name" with the time underneath, for table cells. Older records without a
// recorded user show "-".
export function MarkedBy({ name, at }: { name?: string | null; at?: When }) {
  if (!name) return <span className="text-muted-foreground">-</span>
  return (
    <span className="text-sm">
      {name}
      {at && (
        <span className="block text-xs text-muted-foreground">
          {formatWhen(at)}
        </span>
      )}
    </span>
  )
}

// One line for page headers, e.g. "Last saved by Priya · 3 Nov 2026, 9:12 AM".
// Picks the most recent of the given records.
export function LastSavedBy({
  records,
}: {
  records: { markedByName?: string | null; updatedAt?: When }[]
}) {
  const latest = records
    .filter((r) => r.markedByName && r.updatedAt)
    .sort(
      (a, b) =>
        new Date(b.updatedAt!).getTime() - new Date(a.updatedAt!).getTime(),
    )[0]
  if (!latest) return null
  return (
    <span className="text-xs text-muted-foreground">
      Last saved by {latest.markedByName} · {formatWhen(latest.updatedAt)}
    </span>
  )
}
