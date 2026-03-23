import { createServerFn } from '@tanstack/react-start'
import { eq, sql, and, gte, lte, count } from 'drizzle-orm'
import { db } from '#/db'
import {
  studentProfiles,
  attendance,
  fees,
  calendarEvents,
} from '#/db/schema'
import { requireRole } from './auth-utils'

export const getDashboardStats = createServerFn({ method: 'GET' }).handler(
  async () => {
    await requireRole(['admin', 'staff'])

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

    // Fee collection stats
    const feeStats = await db
      .select({
        totalDue: sql<number>`COALESCE(SUM(${fees.amount}), 0)`,
        totalCollected: sql<number>`COALESCE(SUM(${fees.paidAmount}), 0)`,
        pendingCount: sql<number>`SUM(CASE WHEN ${fees.status} IN ('pending', 'partial', 'overdue') THEN 1 ELSE 0 END)`,
        paidCount: sql<number>`SUM(CASE WHEN ${fees.status} = 'paid' THEN 1 ELSE 0 END)`,
      })
      .from(fees)

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

    return {
      totalStudents: studentCount.count,
      todayAttendance: {
        marked: totalMarked,
        present: presentToday,
        rate: attendanceRate,
      },
      fees: {
        totalDue: feeStats[0].totalDue,
        totalCollected: feeStats[0].totalCollected,
        collectionRate,
        pendingCount: Number(feeStats[0].pendingCount) || 0,
        paidCount: Number(feeStats[0].paidCount) || 0,
      },
      upcomingEvents: upcomingEvents.slice(0, 5),
    }
  },
)
