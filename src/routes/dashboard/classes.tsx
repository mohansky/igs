import { createFileRoute, redirect } from '@tanstack/react-router'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { ColumnDef } from '@tanstack/react-table'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '#/components/ui/dialog'
import { CustomDataTable } from '#/components/dashboard/custom-data-table'
import {
  listClasses,
  createClass,
  updateClass,
  deleteClass,
} from '#/server/classes'

export const Route = createFileRoute('/dashboard/classes')({
  beforeLoad: ({ context }) => {
    const userRole =
      (context.session.user as { role?: string }).role ?? 'student'
    if (userRole !== 'admin') {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: ClassesPage,
})

interface ClassItem {
  id: number
  name: string
  section: string | null
  academicYear: string
  capacity: number | null
  isActive: boolean | null
}

function ClassesPage() {
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingClass, setEditingClass] = useState<ClassItem | null>(null)
  const [name, setName] = useState('')
  const [section, setSection] = useState('')
  const [academicYear, setAcademicYear] = useState('2025-2026')
  const [capacity, setCapacity] = useState('')

  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: () => listClasses() as Promise<ClassItem[]>,
  })

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['classes'] })

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editingClass) {
        await updateClass({
          data: {
            id: editingClass.id,
            updates: {
              name,
              section: section || null,
              academicYear,
              capacity: capacity ? Number(capacity) : null,
            },
          },
        })
      } else {
        await createClass({
          data: {
            name,
            section: section || null,
            academicYear,
            capacity: capacity ? Number(capacity) : null,
          },
        })
      }
    },
    onSuccess: () => {
      setDialogOpen(false)
      invalidate()
    },
    onError: () => toast.error('Failed to save class'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteClass({ data: { id } }),
    onSuccess: invalidate,
    onError: () => toast.error('Failed to delete class'),
  })

  const openCreate = () => {
    setEditingClass(null)
    setName('')
    setSection('')
    setAcademicYear('2025-2026')
    setCapacity('')
    setDialogOpen(true)
  }

  const openEdit = (cls: ClassItem) => {
    setEditingClass(cls)
    setName(cls.name)
    setSection(cls.section ?? '')
    setAcademicYear(cls.academicYear)
    setCapacity(cls.capacity?.toString() ?? '')
    setDialogOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    saveMutation.mutate()
  }

  const handleDelete = (id: number) => {
    if (!confirm('Are you sure you want to delete this class?')) return
    deleteMutation.mutate(id)
  }

  const columns: ColumnDef<ClassItem>[] = [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <span className="font-medium">{row.getValue('name')}</span>
      ),
    },
    {
      accessorKey: 'section',
      header: 'Section',
      cell: ({ row }) => row.getValue('section') ?? '-',
    },
    {
      accessorKey: 'academicYear',
      header: 'Academic Year',
    },
    {
      accessorKey: 'capacity',
      header: 'Capacity',
      cell: ({ row }) => row.getValue('capacity') ?? '-',
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const cls = row.original
        return (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => openEdit(cls)}
            >
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDelete(cls.id)}
            >
              Delete
            </Button>
          </div>
        )
      },
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Classes</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}>Add Class</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingClass ? 'Edit Class' : 'Create Class'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Nursery"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Section (optional)</Label>
                <Input
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                  placeholder="e.g. A"
                />
              </div>
              <div className="space-y-2">
                <Label>Academic Year</Label>
                <Input
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Capacity (optional)</Label>
                <Input
                  type="number"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <CustomDataTable
        columns={columns}
        data={classes}
        filters={[
          { column: 'name', placeholder: 'Search by name...' },
        ]}
      />
    </div>
  )
}
