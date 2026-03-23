import { useState, useMemo } from 'react'
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
import { createFeeRecord } from '#/server/fees'
import { listStudents } from '#/server/students'

interface StudentItem {
  id: number
  studentName: string
  admissionNumber: string | null
}

export function CreateFeeDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false)
  const [studentUserId, setStudentUserId] = useState('')
  const [studentSearch, setStudentSearch] = useState('')
  const [showResults, setShowResults] = useState(false)
  const [amount, setAmount] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [description, setDescription] = useState('')

  const { data: students = [] } = useQuery({
    queryKey: ['students'],
    queryFn: () => listStudents() as Promise<StudentItem[]>,
    enabled: open,
  })

  const filtered = useMemo(() => {
    if (!studentSearch.trim()) return []
    const q = studentSearch.toLowerCase()
    return students.filter(
      (s) =>
        s.studentName.toLowerCase().includes(q) ||
        (s.admissionNumber && s.admissionNumber.toLowerCase().includes(q)),
    )
  }, [studentSearch, students])

  const selectedStudent = students.find((s) => String(s.id) === studentUserId)

  const createMutation = useMutation({
    mutationFn: () =>
      createFeeRecord({
        data: {
          studentUserId,
          amount: Number(amount),
          dueDate,
          description: description || undefined,
        },
      }),
    onSuccess: () => {
      setOpen(false)
      resetForm()
      onCreated()
    },
    onError: () => toast.error('Failed to create fee record'),
  })

  const resetForm = () => {
    setStudentUserId('')
    setStudentSearch('')
    setAmount('')
    setDueDate('')
    setDescription('')
    setShowResults(false)
  }

  const handleSelectStudent = (student: StudentItem) => {
    setStudentUserId(String(student.id))
    setStudentSearch(
      student.admissionNumber
        ? `${student.studentName} (${student.admissionNumber})`
        : student.studentName,
    )
    setShowResults(false)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!studentUserId) {
      toast.error('Please select a student')
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
        <Button>Create Fee</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Fee Record</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative space-y-2">
            <Label htmlFor="fee-student-search">Student</Label>
            <Input
              id="fee-student-search"
              value={studentSearch}
              onChange={(e) => {
                setStudentSearch(e.target.value)
                setStudentUserId('')
                setShowResults(true)
              }}
              onFocus={() => {
                if (studentSearch.trim()) setShowResults(true)
              }}
              placeholder="Search by name or admission number..."
              autoComplete="off"
            />
            {selectedStudent && (
              <p className="text-xs text-muted-foreground">
                Selected: {selectedStudent.studentName}
                {selectedStudent.admissionNumber &&
                  ` (${selectedStudent.admissionNumber})`}
              </p>
            )}
            {showResults && filtered.length > 0 && (
              <ul className="absolute top-full z-10 mt-1 max-h-48 w-full overflow-auto rounded-md border bg-popover p-1 shadow-md">
                {filtered.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                      onClick={() => handleSelectStudent(s)}
                    >
                      <span className="font-medium">{s.studentName}</span>
                      {s.admissionNumber && (
                        <span className="text-xs text-muted-foreground">
                          {s.admissionNumber}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {showResults &&
              studentSearch.trim() &&
              filtered.length === 0 && (
                <div className="absolute top-full z-10 mt-1 w-full rounded-md border bg-popover p-3 text-center text-sm text-muted-foreground shadow-md">
                  No students found
                </div>
              )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="fee-amount">Amount</Label>
            <Input
              id="fee-amount"
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fee-due-date">Due Date</Label>
            <Input
              id="fee-due-date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fee-description">Description</Label>
            <Input
              id="fee-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Tuition Fee - March 2026"
            />
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={createMutation.isPending || !studentUserId}
          >
            {createMutation.isPending ? 'Creating...' : 'Create Fee'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
