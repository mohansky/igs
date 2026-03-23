import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { AttendanceMarker } from '#/components/dashboard/AttendanceMarker'
import { AttendanceHistory } from '#/components/dashboard/AttendanceHistory'
import { AttendanceLog } from '#/components/dashboard/AttendanceLog'
import { getChildrenByParent } from '#/server/students'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '#/components/ui/tabs'

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
    return <p className="text-sm text-muted-foreground">Loading...</p>
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
