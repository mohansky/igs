import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { AttendanceMarker } from '#/components/dashboard/AttendanceMarker'
import { AttendanceHistory } from '#/components/dashboard/AttendanceHistory'
import { AttendanceLog } from '#/components/dashboard/AttendanceLog'
import { getChildrenByParent } from '#/server/students'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs'
import { Skeleton } from '#/components/ui/skeleton'
import { Card, CardContent } from '#/components/ui/card'

export const Route = createFileRoute('/dashboard/attendance')({
  component: AttendancePage,
})

function AttendancePage() {
  const { session } = Route.useRouteContext()
  const userRole = (session.user as { role?: string }).role ?? 'student'
  const isStaffOrAdmin = userRole === 'admin' || userRole === 'staff'

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Attendance</h1>

      {isStaffOrAdmin ? (
        <Tabs defaultValue="mark">
          <TabsList>
            <TabsTrigger value="mark">Mark Attendance</TabsTrigger>
            <TabsTrigger value="history">View History</TabsTrigger>
          </TabsList>
          <TabsContent value="mark">
            <AttendanceMarker />
          </TabsContent>
          <TabsContent value="history">
            <AttendanceLog />
          </TabsContent>
        </Tabs>
      ) : (
        <ParentAttendanceView />
      )}
    </div>
  )
}

function ParentAttendanceView() {
  const { data: children = [], isLoading } = useQuery({
    queryKey: ['children'],
    queryFn: () => getChildrenByParent(),
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-28" />
        </div>
        <Card>
          <CardContent className="p-0">
            <div className="flex gap-2 border-b p-4">
              <Skeleton className="h-9 w-48" />
              <Skeleton className="h-9 w-32" />
            </div>
            <div className="divide-y">
              {Array.from({ length: 6 }).map((_, r) => (
                <div key={r} className="flex items-center gap-4 px-4 py-3">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (children.length > 0) {
    return (
      <Tabs defaultValue={String(children[0].id)}>
        <TabsList>
          {children.map((child) => (
            <TabsTrigger key={child.id} value={String(child.id)}>
              {child.studentName}
            </TabsTrigger>
          ))}
        </TabsList>
        {children.map((child) => (
          <TabsContent key={child.id} value={String(child.id)}>
            <AttendanceHistory studentProfileId={child.id} />
          </TabsContent>
        ))}
      </Tabs>
    )
  }

  // Fallback: no children linked
  return <AttendanceHistory />
}
