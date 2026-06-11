import { createFileRoute, redirect } from '@tanstack/react-router'
import TrashIcon from '#/components/icons/TrashIcon'
import EditIcon from '#/components/icons/EditIcon'
import { IconButton } from '#/components/dashboard/IconButton'
import { useState } from 'react'
import { ConfirmDialog } from '#/components/dashboard/ConfirmDialog'
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
import { CustomDataTable } from '#/components/dashboard/CustomDataTable'
import { Skeleton } from '#/components/ui/skeleton'
import { Card, CardContent } from '#/components/ui/card'
import {
  listClasses,
  createClass,
  updateClass,
  deleteClass,
} from '#/server/classes'
import AddIcon from '#/components/icons/AddIcon'

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
  const [deleteId, setDeleteId] = useState<number | null>(null)

  const { data: classes = [], isLoading } = useQuery({
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
    setDeleteId(id)
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
          <div className="flex gap-1">
            <IconButton
              tooltip="Edit"
              icon={EditIcon}
              className="text-primary"
              onClick={() => openEdit(cls)}
            />
            <IconButton
              tooltip="Delete"
              icon={TrashIcon}
              className="text-destructive"
              onClick={() => handleDelete(cls.id)}
            />
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
            <Button onClick={openCreate}>
              <AddIcon className="h-4 w-4" /> Add Class
            </Button>
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

      {isLoading ? (
        <Card>
          <CardContent className="p-0">
            <div className="flex gap-2 border-b p-4">
              <Skeleton className="h-9 w-48" />
            </div>
            <div className="divide-y">
              {Array.from({ length: 5 }).map((_, r) => (
                <div key={r} className="flex items-center gap-4 px-4 py-3">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-8 w-24" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <CustomDataTable
          columns={columns}
          data={classes}
          filters={[{ column: 'name', placeholder: 'Search by name...' }]}
        />
      )}

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete class?"
        description="This will deactivate this class. Students assigned to it will need to be reassigned."
        confirmLabel="Delete"
        onConfirm={() => {
          if (deleteId !== null) deleteMutation.mutate(deleteId)
          setDeleteId(null)
        }}
      />
    </div>
  )
}
