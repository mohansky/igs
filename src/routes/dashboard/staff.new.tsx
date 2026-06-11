import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '#/components/ui/button'
import { StaffForm, type StaffFormData } from '#/components/dashboard/StaffForm'
import { createStaff } from '#/server/staff'

export const Route = createFileRoute('/dashboard/staff/new')({
  beforeLoad: ({ context }) => {
    const userRole =
      (context.session.user as { role?: string }).role ?? 'student'
    if (userRole !== 'admin') {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: NewStaffPage,
})

function NewStaffPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const createMutation = useMutation({
    mutationFn: (data: StaffFormData) => {
      const { name, email, password, ...profile } = data
      if (!password) throw new Error('Password is required')
      const profileData = { ...profile } as Record<string, unknown>
      if (Array.isArray(profileData.languagesSpoken)) {
        profileData.languagesSpoken = JSON.stringify(
          profileData.languagesSpoken,
        )
      }
      return createStaff({
        data: {
          name,
          email,
          password,
          profile: profileData as Parameters<
            typeof createStaff
          >[0]['data']['profile'],
        },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] })
      toast.success('Staff member created')
      navigate({ to: '/dashboard/staff' })
    },
    onError: (err: Error) =>
      toast.error(err.message || 'Failed to create staff'),
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Add New Staff</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigate({ to: '/dashboard/staff' })}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="staff-form"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>
      <StaffForm
        mode="create"
        onSubmit={(data) => createMutation.mutate(data)}
      />
    </div>
  )
}
