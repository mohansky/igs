import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ArrowDown01Icon, ArrowUp01Icon } from 'hugeicons-react'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Checkbox } from '#/components/ui/checkbox'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Skeleton } from '#/components/ui/skeleton'
import { Switch } from '#/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { ConfirmDialog } from '#/components/dashboard/ConfirmDialog'
import { feeCategoriesQuery } from '#/components/dashboard/FeeCategorySelect'
import { formatCurrency, formatDate } from '#/lib/utils'
import { TUITION_KEY, suggestFeeCategoryKey } from '#/lib/fee-categories'
import {
  assignFeeCategory,
  createFeeCategory,
  deleteFeeCategory,
  listUncategorisedFees,
  saveFeeCategoryOrder,
  updateFeeCategory,
} from '#/server/fee-categories'

const selectClass =
  'flex h-8 w-full rounded-md border border-input bg-transparent px-2 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'

// The Fees page's Categories tab. Admin only (auditors don't get the tab).
export function FeeCategoriesManager() {
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        What each fee is for. Pass-through categories (books, uniform) are cost
        recovery, reported separately from fee income.
      </p>
      <Tabs defaultValue="categories">
        <TabsList>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="uncategorised">Uncategorised fees</TabsTrigger>
        </TabsList>
        <TabsContent value="categories">
          <CategoriesTab />
        </TabsContent>
        <TabsContent value="uncategorised">
          <UncategorisedTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ── Categories ───────────────────────────────────────────────

function CategoriesTab() {
  const queryClient = useQueryClient()
  const { data: categories = [], isLoading } = useQuery(feeCategoriesQuery)
  const [newName, setNewName] = useState('')
  const [newPassThrough, setNewPassThrough] = useState(false)
  const [renaming, setRenaming] = useState<{ id: number; name: string } | null>(
    null,
  )
  const [toDelete, setToDelete] = useState<{ id: number; name: string } | null>(
    null,
  )

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['fee-categories'] })
    queryClient.invalidateQueries({ queryKey: ['fees'] })
  }
  const onError = (e: Error) => toast.error(e.message || 'Something went wrong')

  const createMutation = useMutation({
    mutationFn: () =>
      createFeeCategory({
        data: { name: newName, isPassThrough: newPassThrough },
      }),
    onSuccess: () => {
      toast.success('Category added')
      setNewName('')
      setNewPassThrough(false)
      refresh()
    },
    onError,
  })

  const updateMutation = useMutation({
    mutationFn: (data: {
      id: number
      name?: string
      isPassThrough?: boolean
      isActive?: boolean
    }) => updateFeeCategory({ data }),
    onSuccess: () => {
      setRenaming(null)
      refresh()
    },
    onError,
  })

  const orderMutation = useMutation({
    mutationFn: (ids: number[]) => saveFeeCategoryOrder({ data: { ids } }),
    onSuccess: refresh,
    onError,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteFeeCategory({ data: { id } }),
    onSuccess: () => {
      toast.success('Category deleted')
      refresh()
    },
    onError,
  })

  const move = (index: number, delta: -1 | 1) => {
    const ids = categories.map((c) => c.id)
    const target = index + delta
    if (target < 0 || target >= ids.length) return
    ;[ids[index], ids[target]] = [ids[target], ids[index]]
    orderMutation.mutate(ids)
  }

  if (isLoading) return <Skeleton className="h-64 w-full" />

  return (
    <div className="space-y-4">
      {categories.length === 0 && (
        <p className="text-sm text-amber-600">
          No categories yet. Run <code>pnpm db:seed:categories</code> to add the
          defaults (Admission Fee, Tuition Fee, Books, Uniform, Other).
        </p>
      )}

      <Card className="p-0">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Pass-through</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="text-right">Fees</TableHead>
                <TableHead className="text-right">Order</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((c, i) => {
                const isTuition = c.key === TUITION_KEY
                return (
                  <TableRow key={c.id}>
                    <TableCell>
                      {renaming?.id === c.id ? (
                        <form
                          className="flex gap-2"
                          onSubmit={(e) => {
                            e.preventDefault()
                            updateMutation.mutate({
                              id: c.id,
                              name: renaming.name,
                            })
                          }}
                        >
                          <Input
                            value={renaming.name}
                            onChange={(e) =>
                              setRenaming({ ...renaming, name: e.target.value })
                            }
                            className="h-8"
                            autoFocus
                            required
                          />
                          <Button size="sm" type="submit">
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            type="button"
                            onClick={() => setRenaming(null)}
                          >
                            Cancel
                          </Button>
                        </form>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span
                            className={
                              c.isActive ? '' : 'text-muted-foreground'
                            }
                          >
                            {c.name}
                          </span>
                          {!c.isActive && (
                            <Badge variant="outline" className="text-[10px]">
                              inactive
                            </Badge>
                          )}
                          {isTuition && (
                            <span className="text-xs text-muted-foreground">
                              · used for bulk fees and concessions
                            </span>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={c.isPassThrough}
                        onCheckedChange={(v) =>
                          updateMutation.mutate({ id: c.id, isPassThrough: v })
                        }
                        aria-label="Pass-through"
                      />
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={c.isActive}
                        disabled={isTuition}
                        onCheckedChange={(v) =>
                          updateMutation.mutate({ id: c.id, isActive: v })
                        }
                        aria-label="Active"
                      />
                    </TableCell>
                    <TableCell className="text-right">{c.feeCount}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label="Move up"
                        disabled={i === 0 || orderMutation.isPending}
                        onClick={() => move(i, -1)}
                      >
                        <ArrowUp01Icon className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label="Move down"
                        disabled={
                          i === categories.length - 1 || orderMutation.isPending
                        }
                        onClick={() => move(i, 1)}
                      >
                        <ArrowDown01Icon className="size-4" />
                      </Button>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setRenaming({ id: c.id, name: c.name })}
                      >
                        Rename
                      </Button>
                      {/* Only unused categories can be deleted; otherwise
                          deactivate, so old fees keep their label. */}
                      {c.feeCount === 0 && !isTuition && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() =>
                            setToDelete({ id: c.id, name: c.name })
                          }
                        >
                          Delete
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle className="text-base">Add a category</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-wrap items-end gap-3"
            onSubmit={(e) => {
              e.preventDefault()
              createMutation.mutate()
            }}
          >
            <div className="min-w-48 flex-1 space-y-2">
              <Label htmlFor="new-category">Name</Label>
              <Input
                id="new-category"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Transport"
                required
              />
            </div>
            <div className="flex items-center gap-2 pb-2">
              <Switch
                id="new-pass-through"
                checked={newPassThrough}
                onCheckedChange={setNewPassThrough}
              />
              <Label htmlFor="new-pass-through">Pass-through</Label>
            </div>
            <Button type="submit" disabled={createMutation.isPending}>
              Add
            </Button>
          </form>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={`Delete "${toDelete?.name}"?`}
        description="No fees use this category, so it can be removed."
        confirmLabel="Delete"
        onConfirm={() => {
          if (toDelete) deleteMutation.mutate(toDelete.id)
          setToDelete(null)
        }}
      />
    </div>
  )
}

// ── Uncategorised fees (backfill) ─────────────────────────────

function UncategorisedTab() {
  const queryClient = useQueryClient()
  const { data: categories = [] } = useQuery(feeCategoriesQuery)
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['uncategorised-fees'],
    queryFn: () => listUncategorisedFees(),
  })

  const active = categories.filter((c) => c.isActive)
  // Seeded categories only: admin-added ones have no key.
  const idByKey = useMemo(
    () =>
      new Map(
        categories
          .filter((c) => c.key !== null && c.isActive)
          .map((c) => [c.key, c.id]),
      ),
    [categories],
  )
  const tuitionId = categories.find((c) => c.key === TUITION_KEY)?.id

  // Per-row choice; falls back to the suggestion until the admin picks.
  const [chosen, setChosen] = useState<Record<number, string>>({})
  const [selected, setSelected] = useState<Set<number>>(new Set())

  const suggestionFor = (r: (typeof rows)[number]) => {
    // Concession fees are tuition by definition.
    const key = r.isOpen ? TUITION_KEY : suggestFeeCategoryKey(r.description)
    const id = key ? idByKey.get(key) : undefined
    return id ? String(id) : ''
  }
  const choiceFor = (r: (typeof rows)[number]) =>
    chosen[r.id] ?? suggestionFor(r)

  const assignMutation = useMutation({
    // Groups by category: one confirmed update per category.
    mutationFn: async (ids: number[]) => {
      const byCategory = new Map<number, number[]>()
      for (const r of rows.filter((x) => ids.includes(x.id))) {
        const c = Number(choiceFor(r))
        if (!c) continue
        byCategory.set(c, [...(byCategory.get(c) ?? []), r.id])
      }
      let updated = 0
      for (const [categoryId, feeIds] of byCategory) {
        updated += (await assignFeeCategory({ data: { feeIds, categoryId } }))
          .updated
      }
      return updated
    },
    onSuccess: (updated) => {
      toast.success(`Categorised ${updated} fee${updated === 1 ? '' : 's'}`)
      setSelected(new Set())
      queryClient.invalidateQueries({ queryKey: ['uncategorised-fees'] })
      queryClient.invalidateQueries({ queryKey: ['fee-categories'] })
      queryClient.invalidateQueries({ queryKey: ['fees'] })
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to categorise'),
  })

  if (isLoading) return <Skeleton className="h-64 w-full" />
  if (rows.length === 0) {
    return (
      <p className="py-6 text-sm text-muted-foreground">
        Every fee has a category.
      </p>
    )
  }

  const selectedWithChoice = [...selected].filter((id) => {
    const r = rows.find((x) => x.id === id)
    return r && choiceFor(r)
  })
  const allSelected = selected.size === rows.length

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {rows.length} fee{rows.length === 1 ? '' : 's'} created before
        categories existed. Suggestions come from the description; nothing
        changes until you apply. Only the category is set — amounts,
        descriptions and payments stay as they are.
      </p>
      <div className="flex items-center gap-3">
        <Button
          size="sm"
          disabled={selectedWithChoice.length === 0 || assignMutation.isPending}
          onClick={() => assignMutation.mutate(selectedWithChoice)}
        >
          Apply to {selectedWithChoice.length} selected
        </Button>
        {selected.size > selectedWithChoice.length && (
          <span className="text-xs text-muted-foreground">
            {selected.size - selectedWithChoice.length} selected without a
            category will be skipped
          </span>
        )}
      </div>
      <Card className="p-0">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={(v) =>
                      setSelected(
                        v ? new Set(rows.map((r) => r.id)) : new Set(),
                      )
                    }
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Due</TableHead>
                <TableHead className="w-56">Category</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const suggestion = suggestionFor(r)
                const value = choiceFor(r)
                return (
                  <TableRow key={r.id}>
                    <TableCell>
                      <Checkbox
                        checked={selected.has(r.id)}
                        onCheckedChange={(v) => {
                          const next = new Set(selected)
                          if (v) next.add(r.id)
                          else next.delete(r.id)
                          setSelected(next)
                        }}
                        aria-label="Select fee"
                      />
                    </TableCell>
                    <TableCell>{r.studentName ?? '-'}</TableCell>
                    <TableCell>{r.description ?? '-'}</TableCell>
                    <TableCell className="text-right">
                      {r.isOpen ? 'Open' : formatCurrency(r.amount)}
                    </TableCell>
                    <TableCell>{formatDate(r.dueDate)}</TableCell>
                    <TableCell>
                      <select
                        className={selectClass}
                        value={value}
                        onChange={(e) =>
                          setChosen({ ...chosen, [r.id]: e.target.value })
                        }
                      >
                        <option value="">— no suggestion —</option>
                        {(r.isOpen
                          ? active.filter((c) => c.id === tuitionId)
                          : active
                        ).map((c) => (
                          <option key={c.id} value={String(c.id)}>
                            {c.name}
                            {String(c.id) === suggestion ? ' (suggested)' : ''}
                          </option>
                        ))}
                      </select>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!value || assignMutation.isPending}
                        onClick={() => assignMutation.mutate([r.id])}
                      >
                        Apply
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
