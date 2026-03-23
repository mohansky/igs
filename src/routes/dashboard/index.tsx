import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Badge } from '#/components/ui/badge'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import { getChildrenByParent } from '#/server/students'
import { getDashboardStats } from '#/server/analytics'
import { formatCurrency } from '#/lib/utils'
import { format, parseISO } from 'date-fns'

export const Route = createFileRoute('/dashboard/')({
  component: DashboardOverview,
})

function DashboardOverview() {
  const { session } = Route.useRouteContext()
  const userRole = (session.user as { role?: string }).role ?? 'student'
  const isStudent = userRole === 'student'
  const isStaffOrAdmin = userRole === 'admin' || userRole === 'staff'

  const { data: children = [] } = useQuery({
    queryKey: ['children'],
    queryFn: () => getChildrenByParent(),
    enabled: isStudent,
  })

  const { data: stats } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: () => getDashboardStats(),
    enabled: isStaffOrAdmin,
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          Welcome, {session.user.name ?? 'User'}
        </h1>
        <p className="text-muted-foreground">
          {userRole === 'admin' && 'Manage your school from here.'}
          {userRole === 'staff' && 'View your classes and mark attendance.'}
          {isStudent &&
            (children.length > 0
              ? `You have ${children.length} child${children.length > 1 ? 'ren' : ''} linked to your account.`
              : 'View your attendance and fees.')}
        </p>
      </div>

      {/* Analytics cards for admin/staff */}
      {isStaffOrAdmin && stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Students"
            value={String(stats.totalStudents)}
            subtitle="Active students"
          />
          <StatCard
            title="Today's Attendance"
            value={
              stats.todayAttendance.rate !== null
                ? `${stats.todayAttendance.rate}%`
                : '-'
            }
            subtitle={
              stats.todayAttendance.marked > 0
                ? `${stats.todayAttendance.present} / ${stats.todayAttendance.marked} present`
                : 'Not marked yet'
            }
          />
          <StatCard
            title="Fee Collection"
            value={
              stats.fees.collectionRate !== null
                ? `${stats.fees.collectionRate}%`
                : '-'
            }
            subtitle={`${formatCurrency(stats.fees.totalCollected)} of ${formatCurrency(stats.fees.totalDue)}`}
          />
          <StatCard
            title="Pending Fees"
            value={String(stats.fees.pendingCount)}
            subtitle={`${stats.fees.paidCount} paid`}
          />
        </div>
      )}

      {/* Upcoming events for admin/staff */}
      {isStaffOrAdmin && stats && stats.upcomingEvents.length > 0 && (
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Upcoming Events</CardTitle>
            <Link to="/dashboard/calendar">
              <span className="text-sm text-primary hover:underline">
                View calendar
              </span>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {stats.upcomingEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="flex items-center gap-2 rounded-md border px-3 py-2"
                >
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">
                      {format(parseISO(ev.startDate), 'MMM')}
                    </p>
                    <p className="text-lg font-bold leading-none">
                      {format(parseISO(ev.startDate), 'd')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">{ev.title}</p>
                    <Badge
                      variant="outline"
                      className="text-[10px] capitalize"
                    >
                      {ev.type}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {isStudent && children.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold">Your Children</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {children.map((child) => (
              <Card key={child.id} className="transition-shadow hover:shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {child.studentName}
                    {child.admissionNumber && (
                      <Badge variant="outline" className="text-xs">
                        #{child.admissionNumber}
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {child.gender ? `${child.gender} · ` : ''}
                    {child.isActive ? 'Active' : 'Inactive'}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isStaffOrAdmin && (
          <>
            <QuickLinkCard
              title="Attendance"
              description="Mark or view attendance records"
              to="/dashboard/attendance"
            />
            <QuickLinkCard
              title="Fees"
              description="Manage fee records and payments"
              to="/dashboard/fees"
            />
            <QuickLinkCard
              title="Calendar"
              description="View academic calendar and events"
              to="/dashboard/calendar"
            />
          </>
        )}
        {userRole === 'admin' && (
          <>
            <QuickLinkCard
              title="Users"
              description="Manage users and roles"
              to="/dashboard/users"
            />
            <QuickLinkCard
              title="Classes"
              description="Manage classes and sections"
              to="/dashboard/classes"
            />
          </>
        )}
        {isStudent && (
          <>
            <QuickLinkCard
              title="Attendance"
              description={
                children.length > 0
                  ? "View your children's attendance"
                  : 'View your attendance history'
              }
              to="/dashboard/attendance"
            />
            <QuickLinkCard
              title="Fees"
              description={
                children.length > 0
                  ? "View your children's fee status"
                  : 'View your fee status and payments'
              }
              to="/dashboard/fees"
            />
            <QuickLinkCard
              title="Calendar"
              description="View school events and holidays"
              to="/dashboard/calendar"
            />
          </>
        )}
        <QuickLinkCard
          title="Profile"
          description="View and update your profile"
          to="/dashboard/profile"
        />
      </div>
    </div>
  )
}

function StatCard({
  title,
  value,
  subtitle,
}: {
  title: string
  value: string
  subtitle: string
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <p className="text-sm text-muted-foreground">{title}</p>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </CardContent>
    </Card>
  )
}

function QuickLinkCard({
  title,
  description,
  to,
}: {
  title: string
  description: string
  to: string
}) {
  return (
    <Link to={to}>
      <Card className="cursor-pointer transition-shadow hover:shadow-md">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{description}</p>
        </CardContent>
      </Card>
    </Link>
  )
}
