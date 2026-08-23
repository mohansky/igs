import { useMemo, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Badge } from '#/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Skeleton } from '#/components/ui/skeleton'
import { ToggleGroup, ToggleGroupItem } from '#/components/ui/toggle-group'
import { getChildrenByParent } from '#/server/students'
import { getDashboardStats } from '#/server/analytics'
import {
  getMonthlyOverview,
  type MonthlyOverviewRow,
} from '#/server/transactions'
import { cn, formatCurrency, formatDate } from '#/lib/utils'
import { typeBadgeVariant } from '#/lib/calendar-event-style'
import { format, parseISO } from 'date-fns'
import {
  Calendar03Icon,
  Invoice02Icon,
  CalendarCheckIn01Icon,
  StudentIcon,
  UserMultipleIcon,
  Book02Icon,
  UserIcon,
  FileAttachmentIcon,
  MoneyReceiveSquareIcon,
  Alert02Icon,
} from 'hugeicons-react'

export const Route = createFileRoute('/dashboard/')({
  component: DashboardOverview,
})

type Stats = NonNullable<Awaited<ReturnType<typeof getDashboardStats>>>

function DashboardOverview() {
  const { session } = Route.useRouteContext()
  const userRole = (session.user as { role?: string }).role ?? 'student'
  const isStudent = userRole === 'student'
  const isStaffOrAdmin = userRole === 'admin' || userRole === 'staff'

  const { data: children = [], isLoading: childrenLoading } = useQuery({
    queryKey: ['children'],
    queryFn: () => getChildrenByParent(),
    enabled: isStudent,
  })

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: () => getDashboardStats() as Promise<Stats>,
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

      {isStaffOrAdmin && statsLoading && <DashboardSkeleton />}

      {userRole === 'admin' && stats && <AdminDashboard stats={stats} />}

      {userRole === 'staff' && stats && <StaffDashboard stats={stats} />}

      {isStudent && childrenLoading && <StudentDashboardSkeleton />}

      {isStudent && !childrenLoading && (
        <ParentStudentDashboard children={children} />
      )}
    </div>
  )
}

// ── Admin Dashboard ──────────────────────────────────────────

function AdminDashboard({ stats }: { stats: Stats }) {
  return (
    <div className="space-y-8">
      {stats.upcomingEvents.length > 0 && (
        <UpcomingEventsCard events={stats.upcomingEvents} />
      )}

      {/* Quick links — moved to top */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <QuickLinkCard
          title="Students"
          description="Manage student records"
          to="/dashboard/students"
          icon={StudentIcon}
          count={stats.counts.students}
        />
        <QuickLinkCard
          title="Attendance"
          description="Mark or view attendance"
          to="/dashboard/attendance"
          icon={Calendar03Icon}
        />
        <QuickLinkCard
          title="Fees"
          description="Manage fee records"
          to="/dashboard/fees"
          icon={Invoice02Icon}
          count={stats.counts.pendingFees}
          countLabel="pending"
        />
        <QuickLinkCard
          title="Calendar"
          description="Events and holidays"
          to="/dashboard/calendar"
          icon={CalendarCheckIn01Icon}
        />
        <QuickLinkCard
          title="Expenses"
          description="Track income and expenses"
          to="/dashboard/expenses"
          icon={MoneyReceiveSquareIcon}
        />
        <QuickLinkCard
          title="Submissions"
          description="Contact form submissions"
          to="/dashboard/submissions"
          icon={FileAttachmentIcon}
          count={stats.counts.unreadSubmissions}
          countLabel="unread"
        />
        <QuickLinkCard
          title="Users"
          description="Manage users and roles"
          to="/dashboard/users"
          icon={UserMultipleIcon}
          count={stats.counts.staff}
          countLabel="staff"
        />
        <QuickLinkCard
          title="Classes"
          description="Manage classes"
          to="/dashboard/classes"
          icon={Book02Icon}
          count={stats.counts.classes}
        />
      </div>

      {/* ── Attendance section ── */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Attendance</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <StatCard
            title="Total Students"
            value={String(stats.totalStudents)}
            subtitle="Active students"
            icon={StudentIcon}
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
            icon={Calendar03Icon}
          />
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            {stats.attendanceTrend.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    Attendance Trend (Last 7 Days)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <BarChart
                    data={stats.attendanceTrend.map((d) => ({
                      label: format(parseISO(d.date), 'dd/MM'),
                      value: d.rate,
                    }))}
                    height={140}
                    suffix="%"
                    color="bg-primary"
                  />
                </CardContent>
              </Card>
            )}
          </div>
          {stats.staffAttendance && (
            <StaffAttendanceCard data={stats.staffAttendance} />
          )}
        </div>
      </section>

      {/* ── Finance section ── */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Finance</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <StatCard
            title="Fee Collection"
            value={
              stats.fees.collectionRate !== null
                ? `${stats.fees.collectionRate}%`
                : '-'
            }
            subtitle={`${formatCurrency(stats.fees.totalCollected)} of ${formatCurrency(stats.fees.totalDue)}`}
            icon={Invoice02Icon}
          />
          <StatCard
            title="Pending Fees"
            value={String(stats.fees.pendingCount)}
            subtitle={`${stats.fees.paidCount} paid`}
            icon={Invoice02Icon}
          />
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <IncomeVsExpensesCard />
          </div>
          <FeeStatusCard stats={stats} />
        </div>
        {stats.recentTransactions.length > 0 && (
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Recent Transactions</CardTitle>
              <Link to="/dashboard/expenses">
                <span className="text-sm text-primary hover:underline">
                  View all
                </span>
              </Link>
            </CardHeader>
            <CardContent className="space-y-2">
              {stats.recentTransactions.map((txn) => (
                <div
                  key={txn.id}
                  className="flex items-center justify-between rounded-md border px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {txn.description || txn.category}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(txn.date)} · {txn.category}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'text-sm font-medium',
                      txn.type === 'income' ? 'text-green-600' : 'text-red-600',
                    )}
                  >
                    {txn.type === 'income' ? '+' : '-'}
                    {formatCurrency(txn.amount)}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </section>

      {/* ── Activity / Alerts ── */}
      <section className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          {stats.activityFeed.length > 0 && (
            <RecentActivityFeed items={stats.activityFeed} />
          )}
          <AlertsCard alerts={stats.alerts} />
        </div>
      </section>
    </div>
  )
}

// ── Staff Dashboard ──────────────────────────────────────────

function StaffDashboard({ stats }: { stats: Stats }) {
  return (
    <div className="space-y-8">
      {stats.upcomingEvents.length > 0 && (
        <UpcomingEventsCard events={stats.upcomingEvents} />
      )}

      {/* Quick links — moved to top */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <QuickLinkCard
          title="Attendance"
          description="Mark or view attendance records"
          to="/dashboard/attendance"
          icon={Calendar03Icon}
        />
        <QuickLinkCard
          title="Students"
          description="View student records"
          to="/dashboard/students"
          icon={StudentIcon}
          count={stats.counts.students}
        />
        <QuickLinkCard
          title="Calendar"
          description="View academic calendar"
          to="/dashboard/calendar"
          icon={CalendarCheckIn01Icon}
        />
        <QuickLinkCard
          title="Submissions"
          description="Contact form submissions"
          to="/dashboard/submissions"
          icon={FileAttachmentIcon}
          count={stats.counts.unreadSubmissions}
          countLabel="unread"
        />
        <QuickLinkCard
          title="Profile"
          description="View and update your profile"
          to="/dashboard/profile"
          icon={UserIcon}
        />
      </div>

      {/* ── Attendance section ── */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Attendance</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <StatCard
            title="Total Students"
            value={String(stats.totalStudents)}
            subtitle="Active students"
            icon={StudentIcon}
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
            icon={Calendar03Icon}
          />
        </div>
        {stats.attendanceTrend.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                Attendance Trend (Last 7 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <BarChart
                data={stats.attendanceTrend.map((d) => ({
                  label: format(parseISO(d.date), 'dd/MM'),
                  value: d.rate,
                }))}
                height={140}
                suffix="%"
                color="bg-primary"
              />
            </CardContent>
          </Card>
        )}
      </section>

      {/* ── Activity / Alerts ── */}
      <section className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          {stats.activityFeed.length > 0 && (
            <RecentActivityFeed items={stats.activityFeed} />
          )}
          <AlertsCard alerts={stats.alerts} />
        </div>
      </section>
    </div>
  )
}

// ── Parent/Student Dashboard ─────────────────────────────────

function ParentStudentDashboard({
  children,
}: {
  children: {
    id: number
    studentName: string
    admissionNumber: string | null
    gender: string | null
    isActive: boolean | null
    relation: string | null
  }[]
}) {
  return (
    <div className="space-y-6">
      {children.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold">Your Children</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {children.map((child) => (
              <Card
                key={child.id}
                className="transition-shadow hover:shadow-md"
              >
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
        <QuickLinkCard
          title="Attendance"
          description={
            children.length > 0
              ? "View your children's attendance"
              : 'View your attendance history'
          }
          to="/dashboard/attendance"
          icon={Calendar03Icon}
        />
        <QuickLinkCard
          title="Fees"
          description={
            children.length > 0
              ? "View your children's fee status"
              : 'View your fee status and payments'
          }
          to="/dashboard/fees"
          icon={Invoice02Icon}
        />
        <QuickLinkCard
          title="Calendar"
          description="View school events and holidays"
          to="/dashboard/calendar"
          icon={CalendarCheckIn01Icon}
        />
        <QuickLinkCard
          title="Profile"
          description="View and update your profile"
          to="/dashboard/profile"
          icon={UserIcon}
        />
      </div>
    </div>
  )
}

// ── Income vs Expenses card ──────────────────────────────────

type FinanceRange = '3' | '6' | '9' | '12' | 'all'

const FINANCE_RANGE_OPTIONS: { value: FinanceRange; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: '3', label: '3M' },
  { value: '6', label: '6M' },
  { value: '9', label: '9M' },
  { value: '12', label: '12M' },
]

function IncomeVsExpensesCard() {
  const [range, setRange] = useState<FinanceRange>('6')

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['monthly-overview'],
    queryFn: () => getMonthlyOverview() as Promise<MonthlyOverviewRow[]>,
  })

  const filtered = useMemo(() => {
    if (range === 'all') return rows
    return rows.slice(0, Number(range))
  }, [rows, range])

  const totals = useMemo(() => {
    const income = filtered.reduce((s, r) => s + r.totalIncome, 0)
    const expenses = filtered.reduce((s, r) => s + r.totalExpenses, 0)
    return { income, expenses, net: income - expenses }
  }, [filtered])

  const trendData = useMemo(
    () =>
      [...filtered].reverse().map((d) => ({
        label: format(parseISO(d.month + '-01'), 'MMM'),
        income: d.totalIncome,
        expenses: d.totalExpenses,
      })),
    [filtered],
  )

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base">Income vs Expenses</CardTitle>
        <Link to="/dashboard/expenses">
          <span className="text-sm text-primary hover:underline">View all</span>
        </Link>
      </CardHeader>
      <CardContent className="space-y-4">
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={range}
          onValueChange={(v) => {
            if (v) setRange(v as FinanceRange)
          }}
        >
          {FINANCE_RANGE_OPTIONS.map((opt) => (
            <ToggleGroupItem key={opt.value} value={opt.value}>
              {opt.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        {isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : totals.income === 0 && totals.expenses === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No transactions in the selected range.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-6">
              <DonutChart
                income={totals.income}
                expenses={totals.expenses}
                size={140}
              />
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className="size-3 rounded-full bg-green-500" />
                  <span className="text-muted-foreground">Income:</span>
                  <span className="font-medium">
                    {formatCurrency(totals.income)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="size-3 rounded-full bg-red-400" />
                  <span className="text-muted-foreground">Expenses:</span>
                  <span className="font-medium">
                    {formatCurrency(totals.expenses)}
                  </span>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-muted-foreground">Net:</span>
                  <span
                    className={cn(
                      'font-bold',
                      totals.net >= 0 ? 'text-green-600' : 'text-red-600',
                    )}
                  >
                    {totals.net >= 0 ? '+' : '-'}
                    {formatCurrency(Math.abs(totals.net))}
                  </span>
                </div>
              </div>
            </div>

            {trendData.length > 0 && (
              <StackedBarChart data={trendData} height={120} />
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

function DonutChart({
  income,
  expenses,
  size = 140,
}: {
  income: number
  expenses: number
  size?: number
}) {
  const total = income + expenses
  const incomePct = total > 0 ? Math.round((income / total) * 100) : 0
  const stroke = size * 0.18
  const radius = size / 2 - stroke / 2
  const circumference = 2 * Math.PI * radius
  const incomeArc = total > 0 ? (income / total) * circumference : 0
  const expensesArc = total > 0 ? (expenses / total) * circumference : 0

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
      >
        {/* Income segment */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="stroke-green-500"
          strokeDasharray={`${incomeArc} ${circumference}`}
          strokeLinecap="butt"
        />
        {/* Expenses segment, offset by income arc length */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="stroke-red-400"
          strokeDasharray={`${expensesArc} ${circumference}`}
          strokeDashoffset={-incomeArc}
          strokeLinecap="butt"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-xl font-bold">{incomePct}%</span>
        <span className="text-[10px] text-muted-foreground">income</span>
      </div>
    </div>
  )
}

function FeeStatusCard({ stats }: { stats: Stats }) {
  const b = stats.fees.statusBreakdown
  const segments = [
    {
      label: 'Paid',
      value: b.paid,
      className: 'stroke-green-500',
      dot: 'bg-green-500',
    },
    {
      label: 'Pending',
      value: b.pending,
      className: 'stroke-amber-500',
      dot: 'bg-amber-500',
    },
    {
      label: 'Partial',
      value: b.partial,
      className: 'stroke-blue-500',
      dot: 'bg-blue-500',
    },
    {
      label: 'Overdue',
      value: b.overdue,
      className: 'stroke-red-500',
      dot: 'bg-red-500',
    },
  ]
  const total = segments.reduce((s, x) => s + x.value, 0)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Fee Collection</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-4">
          <MultiSegmentDonut
            segments={segments}
            size={120}
            centerLabel={`${stats.fees.collectionRate ?? 0}%`}
            centerSubLabel="collected"
          />
          <div className="space-y-1 text-xs">
            <p className="text-muted-foreground">
              {formatCurrency(stats.fees.totalCollected)}
            </p>
            <p className="text-muted-foreground">
              of {formatCurrency(stats.fees.totalDue)}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
          {segments.map((s) => (
            <div key={s.label} className="flex items-center gap-2">
              <span className={cn('size-2.5 rounded-full', s.dot)} />
              <span className="text-muted-foreground">{s.label}:</span>
              <span className="font-medium">{s.value}</span>
            </div>
          ))}
          <div className="col-span-2 mt-1 text-muted-foreground">
            Total: {total} fee record{total === 1 ? '' : 's'}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function MultiSegmentDonut({
  segments,
  size = 120,
  centerLabel,
  centerSubLabel,
}: {
  segments: { label: string; value: number; className: string }[]
  size?: number
  centerLabel?: string
  centerSubLabel?: string
}) {
  const total = segments.reduce((s, x) => s + x.value, 0)
  const stroke = size * 0.18
  const radius = size / 2 - stroke / 2
  const circumference = 2 * Math.PI * radius

  let offset = 0
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
      >
        {total === 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={stroke}
            className="stroke-muted"
          />
        )}
        {total > 0 &&
          segments
            .filter((s) => s.value > 0)
            .map((s) => {
              const arc = (s.value / total) * circumference
              const dashoffset = -offset
              offset += arc
              return (
                <circle
                  key={s.label}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  strokeWidth={stroke}
                  className={s.className}
                  strokeDasharray={`${arc} ${circumference}`}
                  strokeDashoffset={dashoffset}
                  strokeLinecap="butt"
                />
              )
            })}
      </svg>
      {(centerLabel || centerSubLabel) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          {centerLabel && (
            <span className="text-xl font-bold">{centerLabel}</span>
          )}
          {centerSubLabel && (
            <span className="text-[10px] text-muted-foreground">
              {centerSubLabel}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

// ── Chart Components ─────────────────────────────────────────

function BarChart({
  data,
  height = 120,
  suffix = '',
  color = 'bg-primary',
  emptyMessage = 'No data yet',
}: {
  data: { label: string; value: number }[]
  height?: number
  suffix?: string
  color?: string
  emptyMessage?: string
}) {
  if (!data.length) {
    return (
      <div
        className="flex items-center justify-center rounded border border-dashed text-sm text-muted-foreground"
        style={{ height }}
      >
        {emptyMessage}
      </div>
    )
  }

  const values = data.map((d) => d.value)
  const maxV = Math.max(...values, 1)
  const minV = Math.min(...values, 0)
  // When values cluster in a narrow band (e.g. attendance % at 85–100),
  // drop the baseline below the min so variance is visible instead of
  // collapsing all bars to near-full height.
  const range = maxV - minV
  const baseline =
    range > 0 && range < maxV * 0.5 ? Math.max(0, minV - Math.max(range, 5)) : 0
  const span = maxV - baseline || 1
  const barAreaHeight = Math.max(height - 30, 20)

  return (
    <div className="flex items-end gap-1.5" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-1">
          <span className="text-[10px] font-medium text-muted-foreground">
            {d.value}
            {suffix}
          </span>
          <div
            className="flex w-full items-end"
            style={{ height: barAreaHeight }}
          >
            <div
              className={cn(
                'w-full cursor-default rounded-t transition-all hover:opacity-80',
                color,
              )}
              style={{
                height: `${Math.max(((d.value - baseline) / span) * 100, 4)}%`,
                minHeight: 4,
              }}
              title={`${d.label}: ${d.value}${suffix}`}
            />
          </div>
          <span className="text-[10px] text-muted-foreground">{d.label}</span>
        </div>
      ))}
    </div>
  )
}

function StackedBarChart({
  data,
  height = 120,
  emptyMessage = 'No transactions yet',
}: {
  data: { label: string; income: number; expenses: number }[]
  height?: number
  emptyMessage?: string
}) {
  if (!data.length) {
    return (
      <div
        className="flex items-center justify-center rounded border border-dashed text-sm text-muted-foreground"
        style={{ height }}
      >
        {emptyMessage}
      </div>
    )
  }

  const max = Math.max(...data.map((d) => Math.max(d.income, d.expenses)), 1)

  return (
    <div className="flex items-end gap-2" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-1">
          <div
            className="flex w-full items-end gap-0.5"
            style={{ height: height - 30 }}
          >
            <div
              className="flex-1 cursor-default rounded-t bg-green-500 transition-all hover:opacity-80"
              style={{
                height: `${Math.max((d.income / max) * 100, 2)}%`,
                minHeight: 2,
              }}
              title={`${d.label} income: ${formatCurrency(d.income)}`}
            />
            <div
              className="flex-1 cursor-default rounded-t bg-red-400 transition-all hover:opacity-80"
              style={{
                height: `${Math.max((d.expenses / max) * 100, 2)}%`,
                minHeight: 2,
              }}
              title={`${d.label} expenses: ${formatCurrency(d.expenses)}`}
            />
          </div>
          <span className="text-[10px] text-muted-foreground">{d.label}</span>
        </div>
      ))}
    </div>
  )
}

// ── Alerts Card ──────────────────────────────────────────────

function AlertsCard({ alerts }: { alerts: Stats['alerts'] }) {
  const items = [
    {
      label: 'Overdue fees',
      count: alerts.overdueFeesCount,
      to: '/dashboard/fees',
      icon: Invoice02Icon,
      color: 'text-red-600',
    },
    {
      label: 'Low attendance (<75%)',
      count: alerts.lowAttendanceCount,
      to: '/dashboard/attendance',
      icon: Calendar03Icon,
      color: 'text-amber-600',
    },
    {
      label: 'Unread submissions',
      count: alerts.unreadSubmissionsCount,
      to: '/dashboard/submissions',
      icon: FileAttachmentIcon,
      color: 'text-blue-600',
    },
  ].filter((i) => i.count > 0)

  if (items.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No alerts — everything looks good!
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Alert02Icon className="size-4" />
          Alerts
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.map((item) => (
          <Link key={item.label} to={item.to}>
            <div className="flex items-center gap-3 rounded-md border px-3 py-2 transition-colors hover:bg-muted/50">
              <item.icon className={cn('size-4', item.color)} />
              <span className="flex-1 text-sm">{item.label}</span>
              <Badge variant="destructive" className="text-xs">
                {item.count}
              </Badge>
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  )
}

// ── Staff Attendance Card ────────────────────────────────────

function StaffAttendanceCard({
  data,
}: {
  data: {
    totalStaff: number
    present: number
    absent: number
    late: number
    leave: number
  }
}) {
  const marked = data.present + data.absent + data.late + data.leave
  const segments = [
    { label: 'Present', value: data.present, color: 'bg-green-500' },
    { label: 'Late', value: data.late, color: 'bg-amber-500' },
    { label: 'Leave', value: data.leave, color: 'bg-blue-400' },
    { label: 'Absent', value: data.absent, color: 'bg-red-400' },
  ]

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base">Staff Today</CardTitle>
        <Link to="/dashboard/staff-attendance">
          <span className="text-sm text-primary hover:underline">View</span>
        </Link>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          {marked} of {data.totalStaff} marked
        </p>
        {marked > 0 && (
          <>
            <div className="flex h-3 overflow-hidden rounded-full">
              {segments.map(
                (seg) =>
                  seg.value > 0 && (
                    <div
                      key={seg.label}
                      className={seg.color}
                      style={{ width: `${(seg.value / marked) * 100}%` }}
                    />
                  ),
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              {segments.map(
                (seg) =>
                  seg.value > 0 && (
                    <div
                      key={seg.label}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground"
                    >
                      <div className={cn('size-2 rounded-full', seg.color)} />
                      {seg.label}: {seg.value}
                    </div>
                  ),
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

// ── Recent Activity Feed ─────────────────────────────────────

function RecentActivityFeed({ items }: { items: Stats['activityFeed'] }) {
  const dotColor: Record<string, string> = {
    registration: 'bg-green-500',
    payment: 'bg-blue-500',
    attendance: 'bg-amber-500',
    submission: 'bg-gray-400',
    salary: 'bg-purple-500',
    'staff-attendance': 'bg-amber-500',
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item, i) => (
          <div key={i} className="flex items-start gap-3">
            <div
              className={cn(
                'mt-1.5 size-2 shrink-0 rounded-full',
                dotColor[item.type] ?? 'bg-gray-400',
              )}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{item.title}</p>
              <p className="truncate text-xs text-muted-foreground">
                {item.subtitle}
              </p>
            </div>
            <span
              className="shrink-0 text-right text-xs text-muted-foreground"
              title={item.timestamp ? relativeTime(item.timestamp) : undefined}
            >
              {item.timestamp ? (
                <>
                  <span className="block">
                    {formatDate(new Date(item.timestamp).toISOString())}
                  </span>
                  <span className="block">
                    {formatTimeOfDay(item.timestamp)}
                  </span>
                </>
              ) : null}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

// ── Upcoming Events ──────────────────────────────────────────

function UpcomingEventsCard({ events }: { events: Stats['upcomingEvents'] }) {
  return (
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
          {events.map((ev) => (
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
                  variant={typeBadgeVariant(ev.type)}
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
  )
}

// ── Shared Components ────────────────────────────────────────

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
}: {
  title: string
  value: string
  subtitle: string
  icon?: React.ComponentType<{ className?: string }>
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <p className="text-sm text-muted-foreground">{title}</p>
        {Icon && <Icon className="size-4 text-muted-foreground" />}
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
  icon: Icon,
  count,
  countLabel,
}: {
  title: string
  description: string
  to: string
  icon?: React.ComponentType<{ className?: string }>
  count?: number
  countLabel?: string
}) {
  return (
    <Link to={to}>
      <Card className="cursor-pointer transition-shadow hover:shadow-md">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-2">
            {Icon && <Icon className="size-5 text-muted-foreground" />}
            <CardTitle className="mb-0">{title}</CardTitle>
            {count !== undefined && count > 0 && (
              <Badge className="text-xs">
                {count}
                {countLabel ? ` ${countLabel}` : ''}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{description}</p>
        </CardContent>
      </Card>
    </Link>
  )
}

// ── Skeletons ───────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="size-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="mb-1 h-7 w-16" />
              <Skeleton className="h-3 w-28" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <Skeleton className="h-5 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-35 w-full" />
          </CardContent>
        </Card>
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <Skeleton className="h-5 w-20" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex-row items-center gap-2 space-y-0">
              <Skeleton className="size-5" />
              <Skeleton className="h-5 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-36" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

function StudentDashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="mb-3 h-6 w-32" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex-row items-center gap-2 space-y-0">
              <Skeleton className="size-5" />
              <Skeleton className="h-5 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-36" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

// ── Utilities ────────────────────────────────────────────────

function formatTimeOfDay(ts: number): string {
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function relativeTime(ts: number): string {
  const diff = Date.now() - ts
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return `${Math.floor(days / 7)}w ago`
}
