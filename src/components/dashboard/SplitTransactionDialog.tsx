import { useEffect, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import TrashIcon from '#/components/icons/TrashIcon'
import AddIcon from '#/components/icons/AddIcon'
import { cn, formatCurrency, formatDate } from '#/lib/utils'
import {
  categoriesFor,
  isValidCategory,
  needsDescription,
} from '#/lib/transaction-categories'
import {
  MAX_SPLIT_LINES,
  MIN_SPLIT_LINES,
  splitAddsUp,
  splitRemainder,
} from '#/lib/transaction-split'
import { splitTransaction } from '#/server/transactions'
import type { TransactionType } from '#/server/transactions'

export interface SplittableTransaction {
  id: number
  type: TransactionType
  category: string
  amount: number
  date: string
  description: string | null
  vendor: string | null
}

interface Line {
  key: number
  category: string
  amount: string
  description: string
}

let nextKey = 0
const blankLine = (category = ''): Line => ({
  key: nextKey++,
  category,
  amount: '',
  description: '',
})

// Splits one transaction into 2+ lines that add up to exactly its amount,
// e.g. a "Harpic and Sugar" bill into Cleaning & Housekeeping and Food &
// Refreshments. A blank line description falls back to the original's.
export function SplitTransactionDialog({
  txn,
  onOpenChange,
  onSplit,
}: {
  txn: SplittableTransaction | null
  onOpenChange: (open: boolean) => void
  onSplit: () => void
}) {
  const [lines, setLines] = useState<Line[]>([])

  useEffect(() => {
    if (!txn) return
    // The first line starts on the original's category when it's still a
    // current one (a retired one like "Supplies" can't be kept).
    const first = isValidCategory(txn.type, txn.category) ? txn.category : ''
    setLines([blankLine(first), blankLine()])
  }, [txn])

  const mutation = useMutation({
    mutationFn: (vars: Parameters<typeof splitTransaction>[0]) =>
      splitTransaction(vars),
    onSuccess: (res) => {
      toast.success(`Split into ${res.ids.length} transactions`)
      onSplit()
      onOpenChange(false)
    },
    onError: (err) =>
      toast.error(
        err instanceof Error && err.message
          ? err.message
          : 'Failed to split transaction',
      ),
  })

  if (!txn) return null

  const fallbackDescription = txn.description?.trim() ?? ''
  const amounts = lines.map((l) => Number(l.amount) || 0)
  const remaining = splitRemainder(txn.amount, amounts)
  const linesValid = lines.every(
    (l) =>
      l.category &&
      Number(l.amount) > 0 &&
      (!needsDescription(l.category) ||
        (l.description.trim() || fallbackDescription) !== ''),
  )
  const canSave =
    linesValid && splitAddsUp(txn.amount, amounts) && !mutation.isPending

  const update = (key: number, patch: Partial<Line>) =>
    setLines((prev) =>
      prev.map((l) => (l.key === key ? { ...l, ...patch } : l)),
    )

  // Puts whatever is left onto the last line with no amount yet (or the
  // last line).
  const fillRemaining = () => {
    if (remaining <= 0) return
    const target =
      [...lines].reverse().find((l) => !(Number(l.amount) > 0)) ??
      lines[lines.length - 1]
    const current = Number(target.amount) || 0
    update(target.key, { amount: String(+(current + remaining).toFixed(2)) })
  }

  const save = () =>
    mutation.mutate({
      data: {
        id: txn.id,
        lines: lines.map((l) => ({
          category: l.category,
          amount: Number(l.amount),
          description: l.description.trim() || fallbackDescription || null,
        })),
      },
    })

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!mutation.isPending) onOpenChange(open)
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Split transaction</DialogTitle>
          <DialogDescription>
            {formatDate(txn.date)} · {txn.description || 'No description'}
            {txn.vendor ? ` · ${txn.vendor}` : ''} ·{' '}
            <span className="font-medium text-foreground">
              {formatCurrency(txn.amount)}
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="hidden grid-cols-[1fr_7rem_1fr_2rem] gap-2 text-xs font-medium text-muted-foreground sm:grid">
            <span>Category</span>
            <span>Amount</span>
            <span>Description</span>
          </div>
          {lines.map((line, i) => (
            <div
              key={line.key}
              className="grid grid-cols-[1fr_6rem_2rem] gap-2 sm:grid-cols-[1fr_7rem_1fr_2rem]"
            >
              <Select
                value={line.category}
                onValueChange={(v) => update(line.key, { category: v })}
              >
                <SelectTrigger
                  className="w-full"
                  aria-label={`Line ${i + 1} category`}
                >
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {categoriesFor(txn.type).map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                aria-label={`Line ${i + 1} amount`}
                placeholder="0.00"
                value={line.amount}
                onChange={(e) => update(line.key, { amount: e.target.value })}
              />
              <Input
                className="order-last col-span-3 sm:order-none sm:col-span-1"
                aria-label={`Line ${i + 1} description`}
                placeholder={
                  needsDescription(line.category) && !fallbackDescription
                    ? 'Required for Other'
                    : fallbackDescription || 'Description'
                }
                value={line.description}
                onChange={(e) =>
                  update(line.key, { description: e.target.value })
                }
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-destructive"
                aria-label={`Remove line ${i + 1}`}
                disabled={lines.length <= MIN_SPLIT_LINES}
                onClick={() =>
                  setLines((prev) => prev.filter((l) => l.key !== line.key))
                }
              >
                <TrashIcon className="size-4" />
              </Button>
            </div>
          ))}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={lines.length >= MAX_SPLIT_LINES}
              onClick={() => setLines((prev) => [...prev, blankLine()])}
            >
              <AddIcon className="size-4" />
              Add line
            </Button>
            <div className="flex items-center gap-2 text-sm">
              <Label className="text-muted-foreground">
                {remaining < 0 ? 'Over by' : 'Remaining'}
              </Label>
              <span
                className={cn(
                  'font-mono font-medium',
                  remaining === 0
                    ? 'text-green-600'
                    : remaining < 0
                      ? 'text-destructive'
                      : 'text-foreground',
                )}
              >
                {formatCurrency(Math.abs(remaining))}
              </span>
              {remaining > 0 && (
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="h-auto px-0"
                  onClick={fillRemaining}
                >
                  Fill
                </Button>
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Each line keeps the original&apos;s date, vendor, payment method,
            receipt and attachment. A blank description uses the
            original&apos;s.
          </p>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={mutation.isPending}
          >
            Cancel
          </Button>
          <Button disabled={!canSave} onClick={save}>
            {mutation.isPending ? 'Splitting...' : 'Split'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
