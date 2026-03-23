import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  StudentProfileForm,
  type ProfileData,
} from '#/components/dashboard/StudentProfileForm'
import { createStudentProfile } from '#/server/students'
import { listClasses } from '#/server/classes'

export const Route = createFileRoute('/dashboard/students/new')({
  beforeLoad: ({ context }) => {
    const userRole =
      (context.session.user as { role?: string }).role ?? 'student'
    if (userRole !== 'admin' && userRole !== 'staff') {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: NewStudentPage,
})

function NewStudentPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: classes = [], isLoading: fetching } = useQuery({
    queryKey: ['classes'],
    queryFn: () =>
      listClasses().then((c) =>
        c.map((cls: { id: number; name: string; section: string | null }) => ({
          id: cls.id,
          name: cls.name,
          section: cls.section,
        })),
      ),
  })

  const createMutation = useMutation({
    mutationFn: (data: ProfileData) => createStudentProfile({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] })
      navigate({ to: '/dashboard/students' })
    },
    onError: () => toast.error('Failed to create student'),
  })

  if (fetching) {
    return <p className="text-muted-foreground">Loading...</p>
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Add New Student</h1>
      <StudentProfileForm
        classes={classes}
        onSubmit={(data) => createMutation.mutate(data)}
        loading={createMutation.isPending}
      />
    </div>
  )
}
