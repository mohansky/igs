import { createFileRoute, redirect } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { UserTable } from '#/components/dashboard/UserTable'
import { CreateUserDialog } from '#/components/dashboard/CreateUserDialog'
import { Skeleton } from '#/components/ui/skeleton'
import { Card, CardContent } from '#/components/ui/card'
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

  const { data: users = [], isLoading } = useQuery({
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
      {isLoading ? (
        <Card>
          <CardContent className="p-0">
            <div className="flex gap-2 border-b p-4">
              <Skeleton className="h-9 w-48" />
              <Skeleton className="h-9 w-32" />
            </div>
            <div className="divide-y">
              {Array.from({ length: 6 }).map((_, r) => (
                <div key={r} className="flex items-center gap-4 px-4 py-3">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <UserTable users={users} onUpdate={invalidateUsers} />
      )}
    </div>
  )
}
