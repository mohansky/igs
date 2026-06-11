import { createFileRoute } from '@tanstack/react-router'
import { Badge } from '#/components/ui/badge'
import { Separator } from '#/components/ui/separator'

export const Route = createFileRoute('/dashboard/docs')({
  component: DocsPage,
})

function DocsPage() {
  const { session } = Route.useRouteContext()
  const userRole = (session.user as { role?: string }).role ?? 'student'

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Dashboard Guide</h1>
        <p className="mt-1 text-muted-foreground">
          A quick guide to help you navigate and use the school dashboard.
        </p>
      </div>

      <Separator />

      {/* Overview */}
      <Section title="Overview">
        <ol className="list-inside list-decimal space-y-2 text-sm text-muted-foreground">
          <li>
            Click <NavLink>Overview</NavLink> in the sidebar (or the IGS
            Dashboard logo) to return to the main dashboard.
          </li>
          {userRole === 'student' ? (
            <>
              <li>
                If you have children linked to your account, their names and
                admission numbers are displayed as cards.
              </li>
              <li>
                Quick-link cards let you jump to <Strong>Attendance</Strong>,{' '}
                <Strong>Fees</Strong>, <Strong>Calendar</Strong>, and{' '}
                <Strong>Profile</Strong>.
              </li>
            </>
          ) : (
            <>
              <li>
                Stat cards show <Strong>Total Students</Strong>,{' '}
                <Strong>Today&apos;s Attendance</Strong>,{' '}
                <Strong>Fee Collection</Strong>, and{' '}
                <Strong>Pending Fees</Strong> at a glance.
              </li>
              <li>
                Charts display the <Strong>Attendance Trend</Strong> (last 7
                days) and <Strong>Income vs Expenses</Strong> (6 months).
              </li>
              <li>
                The sidebar cards show <Strong>Fee Collection</Strong> progress,{' '}
                <Strong>Alerts</Strong> (overdue fees, low attendance, unread
                submissions), and <Strong>Staff Attendance</Strong> for today.
              </li>
              <li>
                A <Strong>Recent Activity</Strong> feed and{' '}
                <Strong>This Month</Strong> finance summary (income, expenses,
                balance, recent transactions) appear below.
              </li>
              <li>
                <Strong>Upcoming Events</Strong> from the calendar are shown
                with dates and type badges.
              </li>
              <li>
                Quick-link cards at the bottom let you jump to every section
                with live counts (pending fees, unread submissions, etc.).
              </li>
            </>
          )}
        </ol>
      </Section>

      <Separator />

      {/* Attendance */}
      <Section title="Attendance">
        {userRole === 'student' ? (
          <ol className="list-inside list-decimal space-y-2 text-sm text-muted-foreground">
            <li>
              Go to <NavLink>Attendance</NavLink> from the sidebar.
            </li>
            <li>
              If you have linked children, use the <Strong>tabs</Strong> to
              switch between each child&apos;s attendance history.
            </li>
            <li>
              Use the <Strong>date range picker</Strong> to filter by dates and
              the <Strong>status filter</Strong> to view only Present, Absent,
              or Late records.
            </li>
            <li>Summary badges at the top show overall attendance counts.</li>
          </ol>
        ) : (
          <>
            <h3 className="mb-2 text-sm font-semibold">Marking Attendance</h3>
            <ol className="list-inside list-decimal space-y-2 text-sm text-muted-foreground">
              <li>
                Go to <NavLink>Attendance</NavLink> and select the{' '}
                <Strong>Mark Attendance</Strong> tab.
              </li>
              <li>
                Select the <Strong>date</Strong> using the date picker (defaults
                to today).
              </li>
              <li>
                Choose a <Strong>class</Strong> from the dropdown and click{' '}
                <Strong>Load Students</Strong>.
              </li>
              <li>
                For each student, click{' '}
                <Badge
                  variant="secondary"
                  className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                >
                  P
                </Badge>{' '}
                (Present),{' '}
                <Badge
                  variant="secondary"
                  className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                >
                  A
                </Badge>{' '}
                (Absent), or{' '}
                <Badge
                  variant="secondary"
                  className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
                >
                  L
                </Badge>{' '}
                (Late).
              </li>
              <li>
                Use the <Strong>search bar</Strong> to find a specific student
                by name.
              </li>
              <li>
                Click <Strong>Save Attendance</Strong> at the bottom.
              </li>
            </ol>
            <Tip>
              You can re-load the same class and date to update attendance that
              was already saved.
            </Tip>

            <h3 className="mb-2 mt-4 text-sm font-semibold">Viewing History</h3>
            <ol className="list-inside list-decimal space-y-2 text-sm text-muted-foreground">
              <li>
                Switch to the <Strong>View History</Strong> tab.
              </li>
              <li>
                Filter by <Strong>date range</Strong>,{' '}
                <Strong>student name</Strong>, or <Strong>status</Strong>.
              </li>
              <li>Click any column header to sort the table.</li>
            </ol>
          </>
        )}
      </Section>

      <Separator />

      {/* Fees */}
      <Section title="Fees">
        {userRole === 'student' ? (
          <ol className="list-inside list-decimal space-y-2 text-sm text-muted-foreground">
            <li>
              Go to <NavLink>Fees</NavLink> from the sidebar.
            </li>
            <li>
              If you have linked children, use the <Strong>tabs</Strong> to
              switch between each child&apos;s fee records.
            </li>
            <li>
              Summary badges show <Strong>Total Due</Strong>,{' '}
              <Strong>Total Paid</Strong>, and <Strong>Balance</Strong>.
            </li>
            <li>
              Use the <Strong>date range picker</Strong> and{' '}
              <Strong>status filter</Strong> to narrow down records.
            </li>
          </ol>
        ) : (
          <>
            <h3 className="mb-2 text-sm font-semibold">Viewing Fees</h3>
            <ol className="list-inside list-decimal space-y-2 text-sm text-muted-foreground">
              <li>
                Go to <NavLink>Fees</NavLink> from the sidebar to see all fee
                records across students.
              </li>
              <li>
                Use <Strong>date range</Strong> and <Strong>status</Strong>{' '}
                filters to narrow results. Click column headers to sort.
              </li>
              <li>
                Click <Strong>Export CSV</Strong> to download the fee data.
              </li>
            </ol>

            <h3 className="mb-2 mt-4 text-sm font-semibold">
              Creating Fee Records
            </h3>
            <ol className="list-inside list-decimal space-y-2 text-sm text-muted-foreground">
              <li>
                Click <Strong>Create Fee</Strong> to add a fee for a single
                student, or <Strong>Bulk Fee</Strong> to create fees for
                multiple students at once.
              </li>
              <li>
                Select the student, enter the <Strong>amount</Strong>,{' '}
                <Strong>due date</Strong>, and a <Strong>description</Strong>.
              </li>
              <li>
                Click <Strong>Create</Strong>. The fee appears with a
                &quot;pending&quot; status.
              </li>
            </ol>

            <h3 className="mb-2 mt-4 text-sm font-semibold">
              Recording a Payment
            </h3>
            <ol className="list-inside list-decimal space-y-2 text-sm text-muted-foreground">
              <li>
                Find the fee in the table and click <Strong>Pay</Strong>.
              </li>
              <li>
                Enter the <Strong>amount paid</Strong>,{' '}
                <Strong>payment method</Strong>, and optionally a{' '}
                <Strong>receipt number</Strong>.
              </li>
              <li>
                Click <Strong>Record Payment</Strong>. The status updates to
                &quot;paid&quot;.
              </li>
            </ol>

            <h3 className="mb-2 mt-4 text-sm font-semibold">
              Editing &amp; Deleting Fees
            </h3>
            <ol className="list-inside list-decimal space-y-2 text-sm text-muted-foreground">
              <li>
                Click <Strong>Edit</Strong> on any fee to update its details
                (amount, due date, description, notes).
              </li>
              <li>
                Click <Strong>Delete</Strong> to permanently remove a fee
                record.
              </li>
            </ol>
          </>
        )}
      </Section>

      <Separator />

      {/* Calendar */}
      <Section title="Calendar">
        <ol className="list-inside list-decimal space-y-2 text-sm text-muted-foreground">
          <li>
            Go to <NavLink>Calendar</NavLink> to view the academic calendar.
          </li>
          <li>
            Navigate months using the <Strong>arrow buttons</Strong>. Days with
            events show colour-coded labels.
          </li>
          <li>Click any day to see its events in the sidebar panel.</li>
          <li>
            The <Strong>legend</Strong> below explains event type colours: Event
            (blue), Holiday (green), Exam (orange), Meeting (purple), Deadline
            (red).
          </li>
        </ol>
        {(userRole === 'admin' || userRole === 'staff') && (
          <>
            <h3 className="mb-2 mt-4 text-sm font-semibold">Managing Events</h3>
            <ol className="list-inside list-decimal space-y-2 text-sm text-muted-foreground">
              <li>
                Click <Strong>Add Event</Strong> at the top (or the{' '}
                <Strong>+</Strong> button on a selected day) to create a new
                event.
              </li>
              <li>
                Fill in the <Strong>title</Strong>, <Strong>type</Strong>,{' '}
                <Strong>start date</Strong>, optional <Strong>end date</Strong>,
                and <Strong>description</Strong>.
              </li>
              <li>
                To edit or delete an event, select the day, then click{' '}
                <Strong>Edit</Strong> or <Strong>Del</Strong> on the event card.
              </li>
            </ol>
          </>
        )}
      </Section>

      <Separator />

      {/* Submissions — staff/admin only */}
      {(userRole === 'admin' || userRole === 'staff') && (
        <>
          <Section title="Contact Submissions">
            <ol className="list-inside list-decimal space-y-2 text-sm text-muted-foreground">
              <li>
                Go to <NavLink>Submissions</NavLink> from the sidebar. This
                shows all messages submitted through the website contact form.
              </li>
              <li>
                Use the <Strong>filter tabs</Strong> (All, New, Read, Replied,
                Archived) to view submissions by status. Counts appear next to
                each tab.
              </li>
              <li>
                Click a submission card to <Strong>expand</Strong> it and see
                the full message, email, and phone number.
              </li>
              <li>
                Use the status buttons to mark a submission as{' '}
                <Strong>Read</Strong>, <Strong>Replied</Strong>, or{' '}
                <Strong>Archived</Strong>.
              </li>
            </ol>
            <Tip>
              New (unread) submissions have a coloured left border to stand out.
            </Tip>
          </Section>

          <Separator />
        </>
      )}

      {/* Students — staff/admin only */}
      {(userRole === 'admin' || userRole === 'staff') && (
        <>
          <Section title="Students">
            <h3 className="mb-2 text-sm font-semibold">Viewing Students</h3>
            <ol className="list-inside list-decimal space-y-2 text-sm text-muted-foreground">
              <li>
                Go to <NavLink>Students</NavLink> from the sidebar.
              </li>
              <li>
                Use the <Strong>search bar</Strong> to filter by name or
                admission number.
              </li>
              <li>
                Use the <Strong>gender</Strong> and <Strong>status</Strong>{' '}
                dropdown filters to narrow results.
              </li>
              <li>
                Click <Strong>Export CSV</Strong> to download the student list.
              </li>
              <li>
                Click <Strong>View</Strong> on any student to see their full
                profile, parent info, and fee records.
              </li>
            </ol>

            <h3 className="mb-2 mt-4 text-sm font-semibold">
              Adding a New Student
            </h3>
            <ol className="list-inside list-decimal space-y-2 text-sm text-muted-foreground">
              <li>
                Click <Strong>Add Student</Strong> at the top of the Students
                page.
              </li>
              <li>
                Fill in the student details: name, date of birth, gender,
                admission number, blood group, class, parent information,
                transport details, and medical notes.
              </li>
              <li>
                Optionally upload a <Strong>photo</Strong>.
              </li>
              <li>
                Click <Strong>Save</Strong>. The student appears in the list.
              </li>
            </ol>

            <h3 className="mb-2 mt-4 text-sm font-semibold">
              Student Detail Page
            </h3>
            <ol className="list-inside list-decimal space-y-2 text-sm text-muted-foreground">
              <li>
                Click <Strong>View</Strong> on any student row to open their
                detail page with photo, basic info, emergency contact,
                transport, previous school, and medical cards.
              </li>
              <li>
                The <Strong>Parent / Guardian</Strong> section shows on-profile
                parent info (up to 3 guardians) and linked user accounts.
              </li>
              <li>
                Click <Strong>Link Parent Account</Strong> to search for and
                link a parent&apos;s user account. Click <Strong>Unlink</Strong>{' '}
                to remove a link.
              </li>
              <li>
                Switch to the <Strong>Fees</Strong> tab to view, record
                payments, edit, or delete fee records for that student.
              </li>
              <li>
                Click <Strong>Edit Profile</Strong> to modify any student
                details.
              </li>
            </ol>

            <h3 className="mb-2 mt-4 text-sm font-semibold">
              Deactivating &amp; Deleting
            </h3>
            <ol className="list-inside list-decimal space-y-2 text-sm text-muted-foreground">
              <li>
                Click <Strong>Deactivate</Strong> to mark a student as inactive
                (reversible).
              </li>
              {userRole === 'admin' && (
                <li>
                  Click <Strong>Delete</Strong> to permanently remove a student
                  profile. Attendance and fee records are kept.
                </li>
              )}
            </ol>
          </Section>

          <Separator />
        </>
      )}

      {/* Staff Attendance — admin only */}
      {userRole === 'admin' && (
        <>
          <Section title="Staff Attendance">
            <h3 className="mb-2 text-sm font-semibold">Marking Attendance</h3>
            <ol className="list-inside list-decimal space-y-2 text-sm text-muted-foreground">
              <li>
                Go to <NavLink>Staff Attendance</NavLink> and select the{' '}
                <Strong>Mark Attendance</Strong> tab.
              </li>
              <li>
                Pick a <Strong>date</Strong> and click{' '}
                <Strong>Load Staff</Strong>.
              </li>
              <li>
                For each staff member, choose <Strong>P</Strong> (Present),{' '}
                <Strong>A</Strong> (Absent), <Strong>L</Strong> (Late), or{' '}
                <Strong>Lv</Strong> (Leave).
              </li>
              <li>
                Optionally set <Strong>Check In</Strong> /{' '}
                <Strong>Check Out</Strong> times and add <Strong>Notes</Strong>.
              </li>
              <li>
                Click <Strong>Save Attendance</Strong> to save all records.
              </li>
            </ol>

            <h3 className="mb-2 mt-4 text-sm font-semibold">Viewing History</h3>
            <ol className="list-inside list-decimal space-y-2 text-sm text-muted-foreground">
              <li>
                Switch to the <Strong>View History</Strong> tab.
              </li>
              <li>
                Filter by <Strong>staff name</Strong>, <Strong>status</Strong>,
                or <Strong>date</Strong>.
              </li>
              <li>
                Summary badges show Present, Absent, Late, and Leave totals.
              </li>
            </ol>
          </Section>

          <Separator />
        </>
      )}

      {/* Users — admin only */}
      {userRole === 'admin' && (
        <>
          <Section title="Users">
            <ol className="list-inside list-decimal space-y-2 text-sm text-muted-foreground">
              <li>
                Go to <NavLink>Users</NavLink> from the sidebar to see all
                registered accounts.
              </li>
              <li>
                Use the <Strong>search</Strong> and <Strong>role filter</Strong>{' '}
                to find specific users.
              </li>
              <li>
                To change a user&apos;s role, use the <Strong>Actions</Strong>{' '}
                dropdown on their row and select a new role.
              </li>
              <li>
                To create a new user account, click <Strong>Create User</Strong>{' '}
                at the top.
              </li>
              <li>
                The <Strong>Linked Students</Strong> column shows which student
                profiles are linked to each parent account.
              </li>
            </ol>
          </Section>

          <Separator />
        </>
      )}

      {/* Classes — admin only */}
      {userRole === 'admin' && (
        <>
          <Section title="Classes">
            <ol className="list-inside list-decimal space-y-2 text-sm text-muted-foreground">
              <li>
                Go to <NavLink>Classes</NavLink> from the sidebar.
              </li>
              <li>
                Click <Strong>Add Class</Strong>, fill in the name (e.g.
                &quot;Nursery&quot;), section (e.g. &quot;A&quot;), academic
                year, and capacity, then click <Strong>Save</Strong>.
              </li>
              <li>
                Click <Strong>Edit</Strong> on any row to update its details.
              </li>
              <li>
                Click <Strong>Delete</Strong> to remove a class.
              </li>
            </ol>
            <Tip>
              Classes must be created before you can assign students or mark
              attendance.
            </Tip>
          </Section>

          <Separator />
        </>
      )}

      {/* Expenses — admin only */}
      {userRole === 'admin' && (
        <>
          <Section title="Expenses &amp; Income">
            <ol className="list-inside list-decimal space-y-2 text-sm text-muted-foreground">
              <li>
                Go to <NavLink>Expenses</NavLink> from the sidebar.
              </li>
              <li>
                Three summary cards show <Strong>Total Income</Strong>,{' '}
                <Strong>Total Expenses</Strong>, and <Strong>Balance</Strong>.
              </li>
              <li>
                Click <Strong>Add Transaction</Strong> to record an income or
                expense entry with category, amount, date, vendor, payment
                method, receipt number, and notes.
              </li>
              <li>
                Use the <Strong>search bar</Strong> to filter by description.
              </li>
              <li>
                Click <Strong>Edit</Strong> to update or <Strong>Delete</Strong>{' '}
                to remove a transaction.
              </li>
            </ol>
            <Tip>
              Switch the <Strong>Type</Strong> between Expense and Income to see
              the matching category list (e.g. Salaries, Utilities for expenses;
              Donations, Grants for income).
            </Tip>
          </Section>

          <Separator />
        </>
      )}

      {/* Profile */}
      <Section title="Profile">
        <ol className="list-inside list-decimal space-y-2 text-sm text-muted-foreground">
          <li>
            Go to <NavLink>Profile</NavLink> from the sidebar.
          </li>
          <li>
            The <Strong>Account</Strong> section shows your name, email, role,
            and avatar. Upload or change your photo, update your name, then
            click <Strong>Save Changes</Strong>.
          </li>
          <li>
            Use the <Strong>Change Password</Strong> section to update your
            password (minimum 8 characters).
          </li>
          {userRole === 'student' && (
            <>
              <li>
                The <Strong>Linked Children</Strong> section shows any student
                profiles connected to your account.
              </li>
              <li>
                The <Strong>Student Profile</Strong> section lets you view and
                update your personal details, transport info, emergency
                contacts, and medical information.
              </li>
            </>
          )}
        </ol>
      </Section>

      <Separator />

      {/* General tips */}
      <Section title="General Tips">
        <ul className="list-inside list-disc space-y-2 text-sm text-muted-foreground">
          <li>
            All tables support <Strong>sorting</Strong> — click any column
            header to sort ascending or descending.
          </li>
          <li>
            Use the <Strong>search and filter</Strong> fields above tables to
            narrow down results.
          </li>
          <li>
            Use the <Strong>pagination controls</Strong> at the bottom of tables
            to navigate through pages.
          </li>
          <li>
            On mobile, tap the <Strong>sidebar trigger</Strong> at the top left
            to open the navigation.
          </li>
          <li>
            Use the <Strong>theme toggle</Strong> in the site header to switch
            between light and dark mode.
          </li>
          <li>
            Data is loaded on demand — you will see a{' '}
            <Strong>skeleton loading state</Strong> while content fetches.
          </li>
        </ul>
      </Section>
    </div>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-3">
      <h2 className="text-xl font-semibold">{title}</h2>
      {children}
    </div>
  )
}

function Strong({ children }: { children: React.ReactNode }) {
  return <span className="font-medium text-foreground">{children}</span>
}

function NavLink({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-medium text-primary underline underline-offset-2">
      {children}
    </span>
  )
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
      <span className="font-medium text-foreground">Tip:</span> {children}
    </div>
  )
}
