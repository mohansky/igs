import { createServerFn } from '@tanstack/react-start'
import { eq, sql, and, gte, lte, count, desc } from 'drizzle-orm'
import { db } from '#/db'
import {
  studentProfiles,
  attendance,
  fees,
  calendarEvents,
  transactions,
  staffAttendance,
  staffSalaries,
  contactSubmissions,
  user,
  classes,
} from '#/db/schema'
import { requireRole } from './auth-utils'
import { formatCurrency } from '#/lib/utils'

export const getDashboardStats = createServerFn({ method: 'GET' }).handler(
  async () => {
    const session = await requireRole(['admin', 'staff'])
    const userRole = (session.user as { role?: string }).role ?? 'staff'
    const isAdmin = userRole === 'admin'

    const today = new Date().toISOString().split('T')[0]

    // Total active students
    const [studentCount] = await db
      .select({ count: count() })
      .from(studentProfiles)
      .where(eq(studentProfiles.isActive, true))

    // Today's attendance
    const todayRecords = await db
      .select({ status: attendance.status })
      .from(attendance)
      .where(eq(attendance.date, today))

    const totalMarked = todayRecords.length
    const presentToday = todayRecords.filter(
      (r) => r.status === 'present',
    ).length
    const attendanceRate =
      totalMarked > 0 ? Math.round((presentToday / totalMarked) * 100) : null

    // Attendance trend (last 7 days with data)
    const attendanceTrend = await db
      .select({
        date: attendance.date,
        total: count(),
        present: sql<number>`SUM(CASE WHEN ${attendance.status} = 'present' THEN 1 ELSE 0 END)`,
      })
      .from(attendance)
      .where(lte(attendance.date, today))
      .groupBy(attendance.date)
      .orderBy(desc(attendance.date))
      .limit(7)

    const attendanceTrendData = attendanceTrend.reverse().map((r) => ({
      date: r.date,
      total: r.total,
      present: Number(r.present),
      rate: r.total > 0 ? Math.round((Number(r.present) / r.total) * 100) : 0,
    }))

    // Fee collection stats (admin only — staff have no fee access, so
    // they get zeros and the UI hides the fee cards/alerts)
    const feeStats = isAdmin
      ? await db
          .select({
            totalDue: sql<number>`COALESCE(SUM(${fees.amount}), 0)`,
            totalCollected: sql<number>`COALESCE(SUM(${fees.paidAmount}), 0)`,
            pendingCount: sql<number>`SUM(CASE WHEN ${fees.status} IN ('pending', 'partial') THEN 1 ELSE 0 END)`,
            paidCount: sql<number>`SUM(CASE WHEN ${fees.status} = 'paid' THEN 1 ELSE 0 END)`,
            overdueCount: sql<number>`SUM(CASE WHEN ${fees.status} IN ('pending', 'partial') AND ${fees.dueDate} < ${today} THEN 1 ELSE 0 END)`,
            // Mutually exclusive buckets for the pie chart:
            pendingOnTimeCount: sql<number>`SUM(CASE WHEN ${fees.status} = 'pending' AND ${fees.dueDate} >= ${today} THEN 1 ELSE 0 END)`,
            partialOnTimeCount: sql<number>`SUM(CASE WHEN ${fees.status} = 'partial' AND ${fees.dueDate} >= ${today} THEN 1 ELSE 0 END)`,
          })
          .from(fees)
      : [
          {
            totalDue: 0,
            totalCollected: 0,
            pendingCount: 0,
            paidCount: 0,
            overdueCount: 0,
            pendingOnTimeCount: 0,
            partialOnTimeCount: 0,
          },
        ]

    const collectionRate =
      feeStats[0].totalDue > 0
        ? Math.round((feeStats[0].totalCollected / feeStats[0].totalDue) * 100)
        : null

    // Upcoming events (next 7 days)
    const nextWeek = new Date()
    nextWeek.setDate(nextWeek.getDate() + 7)
    const nextWeekStr = nextWeek.toISOString().split('T')[0]

    const upcomingEvents = await db
      .select()
      .from(calendarEvents)
      .where(
        and(
          gte(calendarEvents.startDate, today),
          lte(calendarEvents.startDate, nextWeekStr),
        ),
      )

    // Alerts: low attendance students (last 30 days, <75%)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0]

    const lowAttendanceResult = await db
      .select({
        count: sql<number>`COUNT(*)`,
      })
      .from(
        db
          .select({
            studentUserId: attendance.studentUserId,
            rate: sql<number>`CAST(SUM(CASE WHEN ${attendance.status} = 'present' THEN 1 ELSE 0 END) AS REAL) / COUNT(*)`,
          })
          .from(attendance)
          .where(gte(attendance.date, thirtyDaysAgoStr))
          .groupBy(attendance.studentUserId)
          .having(
            sql`CAST(SUM(CASE WHEN ${attendance.status} = 'present' THEN 1 ELSE 0 END) AS REAL) / COUNT(*) < 0.75`,
          )
          .as('low_att'),
      )

    // Alerts: unread submissions
    const [unreadSubs] = await db
      .select({ count: count() })
      .from(contactSubmissions)
      .where(eq(contactSubmissions.status, 'new'))

    // Counts for quick links
    const [classCount] = await db
      .select({ count: count() })
      .from(classes)
      .where(eq(classes.isActive, true))

    const [staffCount] = await db
      .select({ count: count() })
      .from(user)
      .where(eq(user.role, 'staff'))

    // Recent activity feed (merge from multiple sources)
    const recentRegistrations = await db
      .select({
        id: studentProfiles.id,
        name: studentProfiles.studentName,
        createdAt: studentProfiles.createdAt,
      })
      .from(studentProfiles)
      .orderBy(desc(studentProfiles.createdAt))
      .limit(5)

    const recentPayments = await db
      .select({
        id: fees.id,
        amount: fees.paidAmount,
        description: fees.description,
        paidDate: fees.paidDate,
        updatedAt: fees.updatedAt,
      })
      .from(fees)
      .where(sql`${fees.paidDate} IS NOT NULL`)
      .orderBy(desc(fees.updatedAt))
      .limit(5)

    const recentSubmissions = await db
      .select({
        id: contactSubmissions.id,
        name: contactSubmissions.name,
        subject: contactSubmissions.subject,
        createdAt: contactSubmissions.createdAt,
      })
      .from(contactSubmissions)
      .orderBy(desc(contactSubmissions.createdAt))
      .limit(5)

    const recentSalaryPayments = await db
      .select({
        id: staffSalaries.id,
        staffName: staffSalaries.staffName,
        netPay: staffSalaries.netPay,
        month: staffSalaries.month,
        updatedAt: staffSalaries.updatedAt,
      })
      .from(staffSalaries)
      .where(eq(staffSalaries.status, 'paid'))
      .orderBy(desc(staffSalaries.updatedAt))
      .limit(5)

    const recentStaffAttendanceDays = await db
      .select({
        date: staffAttendance.date,
        latest: sql<string>`MAX(${staffAttendance.createdAt})`,
        present: sql<number>`SUM(CASE WHEN ${staffAttendance.status} = 'present' THEN 1 ELSE 0 END)`,
        marked: count(),
      })
      .from(staffAttendance)
      .groupBy(staffAttendance.date)
      .orderBy(desc(sql`MAX(${staffAttendance.createdAt})`))
      .limit(3)

    const toMillis = (
      raw: number | string | Date | null | undefined,
    ): number =>
      raw == null ? 0 : typeof raw === 'number' ? raw : new Date(raw).getTime()

    type ActivityItem = {
      type:
        | 'registration'
        | 'payment'
        | 'submission'
        | 'salary'
        | 'staff-attendance'
      title: string
      subtitle: string
      timestamp: number
    }

    const activityFeed: ActivityItem[] = [
      ...recentRegistrations.map((r) => ({
        type: 'registration' as const,
        title: `${r.name} registered`,
        subtitle: 'New student',
        timestamp: toMillis(r.createdAt),
      })),
      ...recentPayments.map((p) => ({
        type: 'payment' as const,
        title: `Payment of ${formatCurrency(p.amount)} received`,
        subtitle: p.description ?? 'Fee payment',
        timestamp: toMillis(p.updatedAt),
      })),
      ...recentSubmissions.map((s) => ({
        type: 'submission' as const,
        title: `${s.name} submitted a form`,
        subtitle: s.subject,
        timestamp: toMillis(s.createdAt),
      })),
      ...recentSalaryPayments.map((s) => ({
        type: 'salary' as const,
        title: `Salary paid to ${s.staffName}`,
        subtitle: `${formatCurrency(s.netPay)} for ${s.month}`,
        timestamp: toMillis(s.updatedAt),
      })),
      ...recentStaffAttendanceDays.map((d) => ({
        type: 'staff-attendance' as const,
        title: `Staff attendance marked for ${d.date}`,
        subtitle: `${Number(d.present)} of ${d.marked} present`,
        timestamp: toMillis(d.latest),
      })),
    ]
      .filter((item) => {
        if (isAdmin) return true
        // Staff cannot see salary or fee-payment activity (admin-only data)
        return item.type !== 'salary' && item.type !== 'payment'
      })
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 10)

    // Admin-only data
    let staffAttendanceData = null
    let monthlyFinanceTrend: {
      month: string
      income: number
      expenses: number
    }[] = []
    let txnSummary = null
    let recentTxns: {
      id: number
      type: string
      category: string
      amount: number
      date: string
      description: string | null
    }[] = []

    if (isAdmin) {
      // Staff attendance today
      const [totalStaffCount] = await db
        .select({ count: count() })
        .from(user)
        .where(eq(user.role, 'staff'))

      const staffTodayRecords = await db
        .select({ status: staffAttendance.status })
        .from(staffAttendance)
        .where(eq(staffAttendance.date, today))

      staffAttendanceData = {
        totalStaff: totalStaffCount.count,
        present: staffTodayRecords.filter((r) => r.status === 'present').length,
        absent: staffTodayRecords.filter((r) => r.status === 'absent').length,
        late: staffTodayRecords.filter((r) => r.status === 'late').length,
        leave: staffTodayRecords.filter((r) => r.status === 'leave').length,
      }

      // Monthly finance trend (last 6 months)
      const sixMonthsAgo = new Date()
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5)
      const sixMonthsAgoStr =
        sixMonthsAgo.toISOString().split('T')[0].slice(0, 7) + '-01'

      monthlyFinanceTrend = await db
        .select({
          month: sql<string>`substr(${transactions.date}, 1, 7)`,
          income: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'income' THEN ${transactions.amount} ELSE 0 END), 0)`,
          expenses: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'expense' THEN ${transactions.amount} ELSE 0 END), 0)`,
        })
        .from(transactions)
        .where(gte(transactions.date, sixMonthsAgoStr))
        .groupBy(sql`substr(${transactions.date}, 1, 7)`)
        .orderBy(sql`substr(${transactions.date}, 1, 7)`)

      // Current month transactions summary
      const monthStart = today.slice(0, 7) + '-01'
      const [txnStats] = await db
        .select({
          totalIncome: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'income' THEN ${transactions.amount} ELSE 0 END), 0)`,
          totalExpenses: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'expense' THEN ${transactions.amount} ELSE 0 END), 0)`,
        })
        .from(transactions)
        .where(gte(transactions.date, monthStart))

      txnSummary = {
        monthlyIncome: txnStats.totalIncome,
        monthlyExpenses: txnStats.totalExpenses,
        balance: txnStats.totalIncome - txnStats.totalExpenses,
      }

      // Recent transactions
      recentTxns = await db
        .select({
          id: transactions.id,
          type: transactions.type,
          category: transactions.category,
          amount: transactions.amount,
          date: transactions.date,
          description: transactions.description,
        })
        .from(transactions)
        .orderBy(desc(transactions.date))
        .limit(5)
    }

    return {
      totalStudents: studentCount.count,
      todayAttendance: {
        marked: totalMarked,
        present: presentToday,
        rate: attendanceRate,
      },
      attendanceTrend: attendanceTrendData,
      fees: {
        totalDue: feeStats[0].totalDue,
        totalCollected: feeStats[0].totalCollected,
        collectionRate,
        pendingCount: Number(feeStats[0].pendingCount) || 0,
        paidCount: Number(feeStats[0].paidCount) || 0,
        statusBreakdown: {
          paid: Number(feeStats[0].paidCount) || 0,
          pending: Number(feeStats[0].pendingOnTimeCount) || 0,
          partial: Number(feeStats[0].partialOnTimeCount) || 0,
          overdue: Number(feeStats[0].overdueCount) || 0,
        },
      },
      alerts: {
        overdueFeesCount: Number(feeStats[0].overdueCount) || 0,
        lowAttendanceCount: Number(lowAttendanceResult[0]?.count) || 0,
        unreadSubmissionsCount: unreadSubs.count,
      },
      counts: {
        students: studentCount.count,
        pendingFees: Number(feeStats[0].pendingCount) || 0,
        unreadSubmissions: unreadSubs.count,
        classes: classCount.count,
        staff: staffCount.count,
      },
      activityFeed,
      staffAttendance: staffAttendanceData,
      transactions: txnSummary,
      recentTransactions: recentTxns,
      monthlyFinanceTrend,
      upcomingEvents: upcomingEvents.slice(0, 5),
    }
  },
)
