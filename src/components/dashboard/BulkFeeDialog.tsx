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
import { createBulkFees } from '#/server/fees'
import { listClasses } from '#/server/classes'

const selectClass =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'

export function BulkFeeDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false)
  const [classId, setClassId] = useState('')
  const [amount, setAmount] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [description, setDescription] = useState('')

  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: () =>
      listClasses().then((c) =>
        c.map((cls: { id: number; name: string; section: string | null }) => ({
          id: cls.id,
          name: cls.name,
          section: cls.section,
        })),
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
    onSuccess: (result) => {
      setOpen(false)
      resetForm()
      onCreated()
      toast.success(`Created ${result.created} fee records`)
    },
    onError: (err) =>
      toast.error(
        err instanceof Error ? err.message : 'Failed to create fees',
      ),
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
        if (!v) resetForm()
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">Bulk Create</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Fees for Entire Class</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          This will create a fee record for every active student in the selected
          class.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Class</Label>
            <select
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              className={selectClass}
              required
            >
              <option value="">Select class</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.section ? ` - ${c.section}` : ''}
                </option>
              ))}
            </select>
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
      </DialogContent>
    </Dialog>
  )
}
