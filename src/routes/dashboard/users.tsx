import { createFileRoute, redirect } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { UserTable } from '#/components/dashboard/UserTable'
import { CreateUserDialog } from '#/components/dashboard/CreateUserDialog'
import { listAllUsers } from '#/server/users'

export const Route = createFileRoute('/dashboard/users')({
  beforeLoad: ({ context }) => {
    const userRole =
      (context.session.user as { role?: string }).role ?? 'student'
    if (userRole !== 'admin') {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: UsersPage,
})

interface User {
  id: string
  name: string
  email: string
  role?: string
  banned?: boolean
  linkedStudents: {
    studentId: number
    studentName: string
    admissionNumber: string | null
  }[]
}

function UsersPage() {
  const queryClient = useQueryClient()

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const data = await listAllUsers()
      return data as unknown as User[]
    },
  })

  const invalidateUsers = () =>
    queryClient.invalidateQueries({ queryKey: ['users'] })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Users</h1>
        <CreateUserDialog onCreated={invalidateUsers} />
      </div>
      <UserTable users={users} onUpdate={invalidateUsers} />
    </div>
  )
}
