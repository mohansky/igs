import { useState, useEffect, useMemo } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { updateFeeRecord } from '#/server/fees'
import { listStudents } from '#/server/students'

interface FeeRecord {
  id: number
  studentUserId: string
  studentProfileId: number | null
  amount: number
  dueDate: string
  description: string | null
  status: string
  notes: string | null
  studentName: string | null
  admissionNumber: string | null
}

interface StudentOption {
  id: number
  studentName: string
  userId: string | null
  admissionNumber: string | null
}

export function EditFeeDialog({
  fee,
  open,
  onOpenChange,
  onUpdated,
}: {
  fee: FeeRecord | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdated: () => void
}) {
  const [amount, setAmount] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState('')
  const [selectedStudentUserId, setSelectedStudentUserId] = useState('')
  const [selectedStudentProfileId, setSelectedStudentProfileId] = useState<
    number | null
  >(null)
  const [selectedStudentName, setSelectedStudentName] = useState('')
  const [studentSearch, setStudentSearch] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)

  const { data: students = [] } = useQuery({
    queryKey: ['students-list'],
    queryFn: () => listStudents() as Promise<StudentOption[]>,
    enabled: open,
  })

  useEffect(() => {
    if (fee) {
      setAmount(String(fee.amount))
      setDueDate(fee.dueDate)
      setDescription(fee.description ?? '')
      setStatus(fee.status)
      setSelectedStudentUserId(fee.studentUserId)
      setSelectedStudentProfileId(fee.studentProfileId)
      setSelectedStudentName(fee.studentName ?? '')
      setStudentSearch('')
      setShowDropdown(false)
    }
  }, [fee])

  const filtered = useMemo(() => {
    if (!studentSearch.trim()) return []
    const q = studentSearch.toLowerCase()
    return students
      .filter(
        (s) =>
          s.userId &&
          (s.studentName.toLowerCase().includes(q) ||
            (s.admissionNumber?.toLowerCase().includes(q) ?? false)),
      )
      .slice(0, 8)
  }, [studentSearch, students])

  const selectStudent = (s: StudentOption) => {
    setSelectedStudentUserId(s.userId!)
    setSelectedStudentProfileId(s.id)
    setSelectedStudentName(s.studentName)
    setStudentSearch('')
    setShowDropdown(false)
  }

  const mutation = useMutation({
    mutationFn: () =>
      updateFeeRecord({
        data: {
          feeId: fee!.id,
          studentUserId: selectedStudentUserId,
          amount: Number(amount),
          dueDate,
          description: description || undefined,
          status,
        },
      }),
    onSuccess: () => {
      toast.success('Fee record updated')
      onOpenChange(false)
      onUpdated()
    },
    onError: () => toast.error('Failed to update fee record'),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!fee || !selectedStudentUserId) return
    mutation.mutate()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Fee</DialogTitle>
        </DialogHeader>
        {fee && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Student</Label>
              <div className="relative">
                {selectedStudentName && !showDropdown ? (
                  <div className="flex items-center justify-between rounded-md border border-input px-3 py-2 text-sm">
                    <div>
                      {selectedStudentProfileId ? (
                        <Link
                          to="/dashboard/students/$studentId"
                          params={{
                            studentId: String(selectedStudentProfileId),
                          }}
                          className="font-medium text-primary hover:underline"
                        >
                          {selectedStudentName}
                        </Link>
                      ) : (
                        <span className="font-medium">
                          {selectedStudentName}
                        </span>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      onClick={() => {
                        setShowDropdown(true)
                        setStudentSearch('')
                      }}
                    >
                      Change
                    </Button>
                  </div>
                ) : (
                  <>
                    <Input
                      placeholder="Search by name or admission #..."
                      value={studentSearch}
                      onChange={(e) => {
                        setStudentSearch(e.target.value)
                        setShowDropdown(true)
                      }}
                      onFocus={() => setShowDropdown(true)}
                    />
                    {showDropdown && filtered.length > 0 && (
                      <ul className="absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-md border bg-popover p-1 shadow-md">
                        {filtered.map((s) => (
                          <li key={s.id}>
                            <button
                              type="button"
                              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                              onClick={() => selectStudent(s)}
                            >
                              <span className="font-medium">
                                {s.studentName}
                              </span>
                              {s.admissionNumber && (
                                <span className="text-xs text-muted-foreground">
                                  ({s.admissionNumber})
                                </span>
                              )}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                    {showDropdown &&
                      studentSearch.trim() &&
                      filtered.length === 0 && (
                        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover p-3 text-center text-sm text-muted-foreground shadow-md">
                          No students found
                        </div>
                      )}
                  </>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-amount">Amount</Label>
              <Input
                id="edit-amount"
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-due-date">Due Date</Label>
              <Input
                id="edit-due-date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Input
                id="edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Tuition Fee - March 2026"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-status">Status</Label>
              <select
                id="edit-status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="partial">Partial</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={mutation.isPending || !selectedStudentUserId}
            >
              {mutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
