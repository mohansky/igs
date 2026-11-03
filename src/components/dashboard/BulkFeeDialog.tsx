import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '#/components/ui/dialog'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { createBulkFees } from '#/server/fees'
import { listClasses } from '#/server/classes'

export function BulkFeeDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false)
  const [classId, setClassId] = useState('')
  const [amount, setAmount] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [description, setDescription] = useState('')
  // Shown after a run: concession students are skipped, by name.
  const [result, setResult] = useState<{
    created: number
    skipped: string[]
  } | null>(null)

  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: () =>
      listClasses().then((c) =>
        c.map(
          (cls: {
            id: number
            name: string
            section: string | null
            academicYear: string | null
          }) => ({
            id: cls.id,
            name: cls.name,
            section: cls.section,
            academicYear: cls.academicYear,
          }),
        ),
      ),
    enabled: open,
  })

  const createMutation = useMutation({
    mutationFn: () =>
      createBulkFees({
        data: {
          classId: Number(classId),
          amount: Number(amount),
          dueDate,
          description: description || undefined,
        },
      }),
    onSuccess: (res) => {
      resetForm()
      onCreated()
      setResult(res)
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : 'Failed to create fees'),
  })

  const resetForm = () => {
    setClassId('')
    setAmount('')
    setDueDate('')
    setDescription('')
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!classId) {
      toast.error('Please select a class')
      return
    }
    createMutation.mutate()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v)
        if (!v) {
          resetForm()
          setResult(null)
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">Bulk Create</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Fees for Entire Class</DialogTitle>
        </DialogHeader>
        {result ? (
          <div className="space-y-4">
            <p className="text-sm font-medium">
              Created {result.created} fee{result.created === 1 ? '' : 's'}
              {' · '}Skipped {result.skipped.length} concession student
              {result.skipped.length === 1 ? '' : 's'}
            </p>
            {result.skipped.length > 0 && (
              <div className="rounded-md border bg-muted/30 p-3">
                <p className="mb-1 text-xs text-muted-foreground">
                  On the concession plan for this year — record their payments
                  against their open fee instead:
                </p>
                <ul className="list-inside list-disc text-sm">
                  {result.skipped.map((name) => (
                    <li key={name}>{name}</li>
                  ))}
                </ul>
              </div>
            )}
            <Button
              className="w-full"
              onClick={() => {
                setOpen(false)
                setResult(null)
              }}
            >
              Done
            </Button>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              This will create a fee record for every active student in the
              selected class, except students on the concession plan for that
              class&apos;s academic year.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Class</Label>
                <Select value={classId} onValueChange={setClassId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name}
                        {c.section ? ` - ${c.section}` : ''}
                        {c.academicYear ? (
                          <span className="ml-1 font-mono text-xs text-muted-foreground">
                            {c.academicYear}
                          </span>
                        ) : null}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Amount per student</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Tuition Fee - April 2026"
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={createMutation.isPending || !classId}
              >
                {createMutation.isPending
                  ? 'Creating...'
                  : 'Create Fees for Class'}
              </Button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
