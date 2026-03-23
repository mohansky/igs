import { createFileRoute } from '@tanstack/react-router'
import { Card, CardContent, CardDescription } from '#/components/ui/card'
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

      {/* Role indicator */}
      <Card>
        <CardContent>
          <CardDescription>
            You are signed in as{' '}
            <Badge variant="secondary" className="capitalize">
              {userRole}
            </Badge>
            . The sections visible to you depend on your role.
          </CardDescription>
        </CardContent>
      </Card>

      <Separator />

      {/* Attendance */}
      <Section title="Attendance">
        {userRole === 'student' ? (
          <ol className="list-inside list-decimal space-y-2 text-sm text-muted-foreground">
            <li>
              Go to <NavLink>Attendance</NavLink> from the sidebar.
            </li>
            <li>
              Your attendance history is displayed in a table. Use the{' '}
              <Strong>date range picker</Strong> to filter by dates.
            </li>
            <li>
              Use the <Strong>status filter</Strong> to view only Present,
              Absent, or Late records.
            </li>
            <li>
              The summary badges at the top show your overall attendance
              percentage.
            </li>
          </ol>
        ) : (
          <>
            <h3 className="mb-2 text-sm font-semibold">Marking Attendance</h3>
            <ol className="list-inside list-decimal space-y-2 text-sm text-muted-foreground">
              <li>
                Go to <NavLink>Attendance</NavLink> from the sidebar.
              </li>
              <li>
                Select the <Strong>date</Strong> using the date picker at the
                top. It defaults to today.
              </li>
              <li>
                Choose a <Strong>class</Strong> from the dropdown and click{' '}
                <Strong>Load Students</Strong>.
              </li>
              <li>
                The student list appears. Each student has three buttons:{' '}
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
                (Absent), and{' '}
                <Badge
                  variant="secondary"
                  className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
                >
                  L
                </Badge>{' '}
                (Late).
              </li>
              <li>
                Click the appropriate button for each student. Selected status
                is highlighted.
              </li>
              <li>
                Use the <Strong>search bar</Strong> to find a specific student
                by name.
              </li>
              <li>
                Once done, click <Strong>Save Attendance</Strong> at the bottom.
                A confirmation toast will appear.
              </li>
            </ol>
            <Tip>
              You can re-load the same class and date to update attendance that
              was already saved.
            </Tip>
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
              The summary badges show your <Strong>Total Due</Strong>,{' '}
              <Strong>Total Paid</Strong>, and <Strong>Balance</Strong>.
            </li>
            <li>
              Use the <Strong>date range picker</Strong> to filter fees by due
              date, or use the <Strong>status filter</Strong> to view only
              pending or paid records.
            </li>
          </ol>
        ) : (
          <>
            <h3 className="mb-2 text-sm font-semibold">Viewing Fees</h3>
            <ol className="list-inside list-decimal space-y-2 text-sm text-muted-foreground">
              <li>
                Go to <NavLink>Fees</NavLink> from the sidebar. All fee records
                across students are displayed.
              </li>
              <li>
                Use the <Strong>date range picker</Strong> to filter by due
                date.
              </li>
              <li>
                Use the <Strong>status filter</Strong> to show only pending,
                paid, or overdue records.
              </li>
              <li>Click any column header to sort the table.</li>
            </ol>

            <h3 className="mb-2 mt-4 text-sm font-semibold">
              Creating a Fee Record
            </h3>
            <ol className="list-inside list-decimal space-y-2 text-sm text-muted-foreground">
              <li>
                Click the <Strong>Create Fee</Strong> button at the top right.
              </li>
              <li>
                Select the <Strong>student</Strong> from the dropdown.
              </li>
              <li>
                Enter the <Strong>amount</Strong>, <Strong>due date</Strong>,
                and a <Strong>description</Strong> (e.g. &quot;Term 1 Tuition
                Fee&quot;).
              </li>
              <li>
                Click <Strong>Create</Strong>. The fee will appear in the table
                with a &quot;pending&quot; status.
              </li>
            </ol>

            <h3 className="mb-2 mt-4 text-sm font-semibold">
              Recording a Payment
            </h3>
            <ol className="list-inside list-decimal space-y-2 text-sm text-muted-foreground">
              <li>
                Find the fee record in the table and click the{' '}
                <Strong>Pay</Strong> button in the Actions column.
              </li>
              <li>
                In the dialog, enter the <Strong>amount paid</Strong>,{' '}
                <Strong>payment method</Strong>, and optionally a{' '}
                <Strong>receipt number</Strong>.
              </li>
              <li>
                Click <Strong>Record Payment</Strong>. The fee status will
                update to &quot;paid&quot;.
              </li>
            </ol>
          </>
        )}
      </Section>

      <Separator />

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
                Browse the student list. Use the <Strong>search bar</Strong> to
                filter by name or admission number.
              </li>
              <li>
                Use the <Strong>gender filter</Strong> to narrow results.
              </li>
              <li>
                Click <Strong>View</Strong> on any student to see their full
                profile, attendance history, and fee records.
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
                admission number, blood group, class, and parent information.
              </li>
              <li>
                Optionally upload a <Strong>photo</Strong> — click the upload
                area to select an image file.
              </li>
              <li>
                Click <Strong>Save</Strong>. The student will appear in the
                list.
              </li>
            </ol>
          </Section>

          <Separator />
        </>
      )}

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
                Archived) to view submissions by status.
              </li>
              <li>
                Click on a submission card to <Strong>expand</Strong> it and see
                the full message, email, and phone number.
              </li>
              <li>
                Use the status buttons to mark a submission as{' '}
                <Strong>Read</Strong>, <Strong>Replied</Strong>, or{' '}
                <Strong>Archived</Strong>.
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
            <h3 className="mb-2 text-sm font-semibold">Managing Classes</h3>
            <ol className="list-inside list-decimal space-y-2 text-sm text-muted-foreground">
              <li>
                Go to <NavLink>Classes</NavLink> from the sidebar.
              </li>
              <li>
                To add a class, click <Strong>Add Class</Strong>, fill in the
                name (e.g. &quot;Nursery&quot;), section (e.g. &quot;A&quot;),
                academic year, and capacity, then click <Strong>Save</Strong>.
              </li>
              <li>
                To edit a class, click the <Strong>Edit</Strong> button in the
                row. Update the details and save.
              </li>
              <li>
                To delete a class, click <Strong>Delete</Strong>. This cannot be
                undone.
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

      {/* Users — admin only */}
      {userRole === 'admin' && (
        <>
          <Section title="Users">
            <ol className="list-inside list-decimal space-y-2 text-sm text-muted-foreground">
              <li>
                Go to <NavLink>Users</NavLink> from the sidebar. This shows all
                registered accounts.
              </li>
              <li>
                Use the <Strong>role filter</Strong> to view only admins, staff,
                or students.
              </li>
              <li>
                To change a user&apos;s role, click the <Strong>Actions</Strong>{' '}
                dropdown on their row and select a new role.
              </li>
              <li>
                To create a new user account, click <Strong>Create User</Strong>{' '}
                at the top.
              </li>
            </ol>
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
          {userRole === 'student' ? (
            <li>
              View and update your personal details, emergency contact, and
              medical information. Click <Strong>Save</Strong> to apply changes.
            </li>
          ) : (
            <li>
              View your account details. Staff and admin profiles show basic
              account information.
            </li>
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
            On mobile, tap the <Strong>menu button</Strong> (bottom right) to
            open the sidebar navigation.
          </li>
          <li>
            Use the <Strong>theme toggle</Strong> in the site header to switch
            between light and dark mode.
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
