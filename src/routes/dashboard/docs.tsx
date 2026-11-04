import { createFileRoute } from '@tanstack/react-router'
import { Badge } from '#/components/ui/badge'
import { Separator } from '#/components/ui/separator'

export const Route = createFileRoute('/dashboard/docs')({
  component: DocsPage,
})

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  staff: 'Staff',
  student: 'Parent / Student',
  auditor: 'Auditor (view-only)',
}

function DocsPage() {
  const { session } = Route.useRouteContext()
  const userRole = (session.user as { role?: string }).role ?? 'student'
  const isAdmin = userRole === 'admin'
  const isStaff = userRole === 'staff'
  const isParent = userRole === 'student'
  const isAuditor = userRole === 'auditor'
  const isSchool = isAdmin || isStaff

  // Sections in page order; each renders only for the roles that can use it.
  const sections: { id: string; title: string; show: boolean }[] = [
    { id: 'getting-around', title: 'Getting around', show: true },
    { id: 'overview', title: 'Overview', show: true },
    { id: 'attendance', title: 'Attendance', show: isSchool || isParent },
    { id: 'my-pages', title: 'My Attendance & Salaries', show: isStaff },
    { id: 'fees', title: 'Fees', show: isAdmin || isParent },
    { id: 'concessions', title: 'Concessions', show: isAdmin || isAuditor },
    {
      id: 'fee-categories',
      title: isAdmin ? 'Fee Categories & Fee Summary' : 'Fee Summary',
      show: isAdmin || isAuditor,
    },
    { id: 'students', title: 'Students', show: isSchool },
    { id: 'enquiries', title: 'Enquiries', show: isSchool },
    { id: 'submissions', title: 'Contact Submissions', show: isSchool },
    { id: 'calendar', title: 'Calendar', show: true },
    { id: 'staff', title: 'Staff', show: isAdmin },
    { id: 'staff-attendance', title: 'Staff Attendance', show: isAdmin },
    { id: 'salaries', title: 'Staff Salaries', show: isAdmin },
    { id: 'expenses', title: 'Expenses & Income', show: isAdmin },
    { id: 'classes', title: 'Classes', show: isAdmin },
    { id: 'users', title: 'Users', show: isAdmin },
    { id: 'gallery', title: 'Gallery', show: isAdmin },
    { id: 'profile', title: 'Profile & Preferences', show: true },
    { id: 'tips', title: 'General Tips', show: true },
  ]
  const visible = sections.filter((s) => s.show)
  const titleOf = (id: string) => sections.find((s) => s.id === id)!.title

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Dashboard Guide</h1>
        <p className="mt-1 text-muted-foreground">
          How to use the school dashboard. This guide only shows the parts you
          can use as <Strong>{ROLE_LABELS[userRole] ?? userRole}</Strong>.
        </p>
      </div>

      <nav aria-label="On this page" className="rounded-lg border p-4">
        <p className="mb-2 text-sm font-semibold">On this page</p>
        <ul className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
          {visible.map((s) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                className="text-primary underline-offset-2 hover:underline"
              >
                {s.title}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <Separator />

      {/* Getting around */}
      <Section id="getting-around" title={titleOf('getting-around')}>
        <Bullets>
          <li>
            The <Strong>sidebar</Strong> lists every page you have access to.
            {(isAdmin || isAuditor) &&
              ' School-wide pages are grouped under Administration.'}{' '}
            On a phone, tap the <Strong>sidebar button</Strong> at the top left
            to open it.
          </li>
          <li>
            Press <Kbd>Ctrl</Kbd> + <Kbd>K</Kbd> (<Kbd>⌘</Kbd> + <Kbd>K</Kbd> on
            a Mac) to open the <Strong>search palette</Strong> and jump to any
            page
            {isSchool && ', student or calendar event'} by typing its name.
          </li>
          <li>
            Forgot your password? On the sign-in page click{' '}
            <Strong>Forgot password?</Strong> and enter your email. A reset link
            valid for one hour is emailed to you. If your account has no real
            email address, ask the school office to reset it.
          </li>
          <li>
            The dashboard can be installed as an app from your browser menu
            (&quot;Install app&quot; / &quot;Add to Home Screen&quot;).
          </li>
        </Bullets>
      </Section>

      <Separator />

      {/* Overview */}
      <Section id="overview" title={titleOf('overview')}>
        <Bullets>
          <li>
            Click <NavLink>Overview</NavLink> (or the IGS logo) to return to the
            main dashboard.
          </li>
          {isParent && (
            <>
              <li>
                Children linked to your account are shown as cards with their
                admission numbers.
              </li>
              <li>
                Quick links take you to <Strong>Attendance</Strong>,{' '}
                <Strong>Fees</Strong>, <Strong>Calendar</Strong> and{' '}
                <Strong>Profile</Strong>.
              </li>
            </>
          )}
          {isSchool && (
            <>
              <li>
                Stat cards show <Strong>Total Students</Strong> and{' '}
                <Strong>Today&apos;s Attendance</Strong>
                {isAdmin && (
                  <>
                    , plus <Strong>Fee Collection</Strong> and{' '}
                    <Strong>Pending Fees</Strong>
                  </>
                )}
                .
              </li>
              <li>
                Charts show the <Strong>Attendance Trend</Strong> for the last 7
                days
                {isAdmin && (
                  <>
                    {' '}
                    and <Strong>Income vs Expenses</Strong> for 6 months
                  </>
                )}
                .
              </li>
              {isAdmin && (
                <li>
                  Side cards show fee collection progress,{' '}
                  <Strong>Alerts</Strong> (overdue fees, low attendance, unread
                  submissions) and today&apos;s staff attendance. Fee collection
                  compares standard fees only; concession fees have no fixed
                  amount.
                </li>
              )}
              <li>
                <Strong>Birthdays this month</Strong> (students and staff),{' '}
                <Strong>Upcoming Events</Strong> and{' '}
                <Strong>Recent Activity</Strong> appear below.
              </li>
              {isAdmin && (
                <li>
                  <Strong>This Month</Strong> sums income, expenses and balance.
                  Each fee payment counts in the month it was received.
                </li>
              )}
            </>
          )}
          {isAuditor && (
            <li>
              As an auditor you have view-only access to reports: open{' '}
              <NavLink>Fees</NavLink> for the <Strong>Concessions</Strong> and{' '}
              <Strong>Fee Summary</Strong> tabs. Nothing you open can be
              changed.
            </li>
          )}
        </Bullets>
      </Section>

      <Separator />

      {/* Attendance */}
      {(isSchool || isParent) && (
        <>
          <Section id="attendance" title={titleOf('attendance')}>
            {isParent ? (
              <Steps>
                <li>
                  Go to <NavLink>Attendance</NavLink>.
                </li>
                <li>
                  If more than one child is linked, use the{' '}
                  <Strong>tabs</Strong> to switch between them.
                </li>
                <li>
                  Use the <Strong>date range</Strong> and{' '}
                  <Strong>status</Strong> filters to see only Present, Absent or
                  Late days. Badges at the top show the totals.
                </li>
              </Steps>
            ) : (
              <>
                <SubHeading first>Marking attendance</SubHeading>
                <Steps>
                  <li>
                    Go to <NavLink>Attendance</NavLink> and open the{' '}
                    <Strong>Mark Attendance</Strong> tab.
                  </li>
                  <li>
                    Pick the <Strong>date</Strong> (defaults to today) and a{' '}
                    <Strong>class</Strong>, then click{' '}
                    <Strong>Load Students</Strong>.
                  </li>
                  <li>
                    For each student click{' '}
                    <StatusBadge tone="green">P</StatusBadge> Present,{' '}
                    <StatusBadge tone="red">A</StatusBadge> Absent or{' '}
                    <StatusBadge tone="yellow">L</StatusBadge> Late. The search
                    box finds a student by name.
                  </li>
                  <li>
                    Click <Strong>Save Attendance</Strong>.
                  </li>
                </Steps>
                <Tip>
                  Load the same class and date again to correct a day. A{' '}
                  <Strong>Last saved by</Strong> line shows who saved that day
                  last and when.
                </Tip>

                <SubHeading>Viewing history</SubHeading>
                <Steps>
                  <li>
                    Open the <Strong>View History</Strong> tab.
                  </li>
                  <li>
                    Filter by <Strong>date range</Strong>,{' '}
                    <Strong>student</Strong> or <Strong>status</Strong>. The{' '}
                    <Strong>Marked by</Strong> column shows who saved each
                    record.
                  </li>
                  <li>
                    Click <Strong>Export CSV</Strong> to download what&apos;s
                    shown.
                  </li>
                </Steps>
              </>
            )}
          </Section>

          <Separator />
        </>
      )}

      {/* My pages — staff */}
      {isStaff && (
        <>
          <Section id="my-pages" title={titleOf('my-pages')}>
            <Bullets>
              <li>
                <NavLink>My Attendance</NavLink> lists your own attendance
                (check-in/out times, notes) and{' '}
                <Strong>My leave this school year</Strong>: casual (CL) and sick
                (SL) leave used and left. The school year runs May to April.
              </li>
              <li>
                <NavLink>My Salaries</NavLink> lists your monthly salary records
                with their status. Click <Strong>Slip</Strong> to open a
                printable salary slip (use Print / Save as PDF).
              </li>
            </Bullets>
          </Section>

          <Separator />
        </>
      )}

      {/* Fees */}
      {(isAdmin || isParent) && (
        <>
          <Section id="fees" title={titleOf('fees')}>
            {isParent ? (
              <Steps>
                <li>
                  Go to <NavLink>Fees</NavLink>.
                </li>
                <li>
                  If more than one child is linked, use the{' '}
                  <Strong>tabs</Strong> to switch between them.
                </li>
                <li>
                  Badges show <Strong>Total Due</Strong>,{' '}
                  <Strong>Total Paid</Strong> and <Strong>Balance</Strong>. Each
                  fee shows its category (e.g. Tuition Fee, Books).
                </li>
                <li>
                  Use the <Strong>date range</Strong> and{' '}
                  <Strong>status</Strong> filters to narrow the list.
                </li>
              </Steps>
            ) : (
              <>
                <SubHeading first>Viewing fees</SubHeading>
                <Steps>
                  <li>
                    Go to <NavLink>Fees</NavLink> to see every student&apos;s
                    fees. Its tabs are <Strong>Fees</Strong>,{' '}
                    <Strong>Concessions</Strong>, <Strong>Fee Summary</Strong>{' '}
                    and <Strong>Categories</Strong> (see below).
                  </li>
                  <li>
                    Filter by student, description, <Strong>category</Strong>,{' '}
                    <Strong>status</Strong>, due month, paid month or date
                    range. Click a column header to sort.
                  </li>
                  <li>
                    Click <Strong>Export CSV</Strong> to download the list
                    (includes the category).
                  </li>
                </Steps>

                <SubHeading>Creating fees</SubHeading>
                <Steps>
                  <li>
                    Click <Strong>Create Fee</Strong> for one student. Pick the
                    student, enter the <Strong>amount</Strong> and{' '}
                    <Strong>due date</Strong>, choose a{' '}
                    <Strong>category</Strong> (required) and add a description.
                  </li>
                  <li>
                    Click <Strong>Bulk Fee</Strong> to bill a whole class at
                    once. The category defaults to Tuition Fee. For tuition,
                    students on the concession plan for that school year are
                    skipped and listed in the result.
                  </li>
                  <li>New fees start as &quot;pending&quot;.</li>
                </Steps>

                <SubHeading>Recording payments</SubHeading>
                <Steps>
                  <li>
                    Click <Strong>Pay</Strong> on a fee.
                  </li>
                  <li>
                    Enter the <Strong>amount paid</Strong>, the{' '}
                    <Strong>payment date</Strong> (today by default; it can be
                    backdated but not in the future), the{' '}
                    <Strong>method</Strong> and optionally a{' '}
                    <Strong>receipt number</Strong>.
                  </li>
                  <li>
                    Click <Strong>Record Payment</Strong>. The fee becomes
                    &quot;partial&quot; or &quot;paid&quot;.
                  </li>
                  <li>
                    To correct a payment&apos;s amount or date, open the
                    fee&apos;s payment history (eye icon) and click{' '}
                    <Strong>Edit</Strong>. Payments in a closed financial year
                    can&apos;t be changed.
                  </li>
                </Steps>

                <SubHeading>Editing and deleting fees</SubHeading>
                <Steps>
                  <li>
                    Click <Strong>Edit</Strong> to change the student, amount,
                    due date, category, description or status. A concession fee
                    can&apos;t be moved to another student.
                  </li>
                  <li>
                    Click <Strong>Delete</Strong> to remove a fee permanently.
                  </li>
                </Steps>
                <Tip>
                  A student&apos;s own fees are also on their profile:{' '}
                  <NavLink>Students</NavLink> → View → <Strong>Fees</Strong>{' '}
                  tab.
                </Tip>
              </>
            )}
          </Section>

          <Separator />
        </>
      )}

      {/* Concessions — admin + auditor */}
      {(isAdmin || isAuditor) && (
        <>
          <Section id="concessions" title={titleOf('concessions')}>
            <p className="text-sm text-muted-foreground">
              A concession (pay what you can) plan lets a family pay any amount
              towards tuition for a school year.
            </p>
            <Bullets>
              {isAdmin && (
                <>
                  <li>
                    On a student&apos;s <Strong>Fees</Strong> tab, click{' '}
                    <Strong>Change plan</Strong> and choose the school year.
                    Convert their existing tuition fee (its payments are kept)
                    or create a new open fee, and set the reference amount.
                  </li>
                  <li>
                    Switching back to <Strong>Standard</Strong> turns the open
                    fee into a normal fee for the reference amount.
                  </li>
                </>
              )}
              <li>
                An open fee has no amount due: it&apos;s never outstanding or
                overdue and accepts any payment. Parents see what they&apos;ve
                paid, without the word &quot;concession&quot;.
              </li>
              <li>
                Concessions apply to <Strong>Tuition Fee</Strong> only. Books,
                uniform and other categories are billed as usual.
              </li>
              <li>
                The <NavLink>Fees</NavLink> → <Strong>Concessions</Strong> tab
                reports, per school year, each concession student&apos;s
                reference fee, amount received, support given so far, number of
                payments and last payment, with totals.
              </li>
            </Bullets>
          </Section>

          <Separator />
        </>
      )}

      {/* Fee categories & summary — admin (+ auditor for the summary) */}
      {(isAdmin || isAuditor) && (
        <>
          <Section id="fee-categories" title={titleOf('fee-categories')}>
            {isAdmin && (
              <>
                <SubHeading first>Fee Categories</SubHeading>
                <Bullets>
                  <li>
                    On <NavLink>Fees</NavLink> → <Strong>Categories</Strong>,
                    add, rename, reorder (arrows) and deactivate categories.
                    Inactive categories disappear from dropdowns but still show
                    on old fees.
                  </li>
                  <li>
                    A category can only be deleted if no fee uses it. Tuition
                    Fee can&apos;t be deactivated or deleted.
                  </li>
                  <li>
                    Mark books, uniform and similar as{' '}
                    <Strong>pass-through</Strong> (cost recovery) so they are
                    totalled apart from fee income.
                  </li>
                  <li>
                    Fees created before categories existed show as{' '}
                    <Strong>Uncategorised</Strong>. The{' '}
                    <Strong>Uncategorised fees</Strong> tab suggests a category
                    from each description; nothing changes until you select rows
                    and apply.
                  </li>
                </Bullets>
              </>
            )}

            {isAdmin && <SubHeading>Fee Summary</SubHeading>}
            <Bullets>
              <li>
                The <NavLink>Fees</NavLink> → <Strong>Fee Summary</Strong> tab
                shows, for fees due in a school year (May to April), what was{' '}
                <Strong>billed</Strong>, <Strong>received</Strong> and is still{' '}
                <Strong>pending</Strong> in each category.
              </li>
              <li>
                Rows are grouped into fee income and pass-through, each with a
                subtotal. Billed and pending leave out concession fees, which
                have no fixed amount; received includes their payments.
              </li>
              <li>
                Pick the year from the dropdown; <Strong>Export CSV</Strong>{' '}
                downloads the table.
              </li>
            </Bullets>
          </Section>

          <Separator />
        </>
      )}

      {/* Students — admin/staff */}
      {isSchool && (
        <>
          <Section id="students" title={titleOf('students')}>
            <SubHeading first>Finding students</SubHeading>
            <Steps>
              <li>
                Go to <NavLink>Students</NavLink>.
              </li>
              <li>
                Search by name or admission number, and filter by class or
                status. Tap a phone number to call it.
              </li>
              <li>
                Use the switch on a row to activate or deactivate a student.{' '}
                <Strong>Export CSV</Strong> downloads the list.
              </li>
            </Steps>

            <SubHeading>Adding a student</SubHeading>
            <Steps>
              <li>
                Click <Strong>Add Student</Strong>.
              </li>
              <li>
                Fill in the details: name, date of birth, gender, admission
                number, class, parents (up to 3), transport, previous school and
                medical notes. Optionally upload a photo.
              </li>
              <li>
                Click <Strong>Save</Strong>.
              </li>
            </Steps>

            <SubHeading>Student page</SubHeading>
            <Bullets>
              <li>
                Click <Strong>View</Strong> on a student. Tabs:{' '}
                <Strong>Profile</Strong>
                {isAdmin && (
                  <>
                    , <Strong>Fees</Strong>
                  </>
                )}
                , <Strong>Attendance</Strong> and <Strong>Documents</Strong>{' '}
                (upload and download files).
              </li>
              <li>
                Under <Strong>Parent / Guardian</Strong>, click{' '}
                <Strong>Link Parent Account</Strong> to connect a parent&apos;s
                login, or <Strong>Unlink</Strong> to remove it. Linked parents
                see this child&apos;s attendance and fees.
              </li>
              <li>
                Click <Strong>Edit Profile</Strong> to change details.
              </li>
              {isAdmin && (
                <li>
                  <Strong>Delete</Strong> permanently removes a student profile.
                  A student with recorded fee payments can&apos;t be deleted;
                  deactivate them instead.
                </li>
              )}
            </Bullets>
          </Section>

          <Separator />
        </>
      )}

      {/* Enquiries — admin/staff */}
      {isSchool && (
        <>
          <Section id="enquiries" title={titleOf('enquiries')}>
            <Bullets>
              <li>
                <NavLink>Enquiries</NavLink> tracks admission enquiries from
                phone calls and walk-ins. Click <Strong>New Enquiry</Strong> to
                add one with the child&apos;s and parent&apos;s details and how
                they heard about the school.
              </li>
              <li>
                Move each enquiry along with its status buttons:{' '}
                <Strong>New</Strong> → <Strong>Visit Scheduled</Strong> →{' '}
                <Strong>Visited</Strong> → <Strong>Applied</Strong>, or{' '}
                <Strong>Closed</Strong>.
              </li>
              <li>
                Set a <Strong>campus visit date and time</Strong> and keep{' '}
                <Strong>internal notes</Strong> on the enquiry. The tabs at the
                top filter by status, with counts.
              </li>
            </Bullets>
          </Section>

          <Separator />
        </>
      )}

      {/* Submissions — admin/staff */}
      {isSchool && (
        <>
          <Section id="submissions" title={titleOf('submissions')}>
            <Bullets>
              <li>
                <NavLink>Submissions</NavLink> holds messages sent through the
                website&apos;s contact and admissions forms, including the
                child&apos;s age or class.
              </li>
              <li>
                Filter with the tabs (All, New, Read, Replied, Archived). New
                messages have a coloured left border.
              </li>
              <li>
                Click a message to expand it, then mark it <Strong>Read</Strong>
                , <Strong>Replied</Strong> or <Strong>Archived</Strong>. Marking
                it Replied records <Strong>Replied by</Strong> with your name.
              </li>
            </Bullets>
          </Section>

          <Separator />
        </>
      )}

      {/* Calendar */}
      <Section id="calendar" title={titleOf('calendar')}>
        <Bullets>
          <li>
            <NavLink>Calendar</NavLink> shows the school calendar. Use the
            arrows to change month and click a day to see its events.
          </li>
          <li>
            Event colours: Event (blue), Holiday (green), Exam (orange), Meeting
            (purple), Deadline (red).
          </li>
          {isSchool && (
            <li>
              Student and staff <Strong>birthdays</Strong> show as pink chips,
              with an <Strong>Upcoming Birthdays</Strong> list for the month.
              They come from the date of birth on each active profile.
            </li>
          )}
        </Bullets>
        {isSchool && (
          <>
            <SubHeading>Managing events</SubHeading>
            <Steps>
              <li>
                Click <Strong>Add Event</Strong> (or <Strong>+</Strong> on a
                selected day).
              </li>
              <li>
                Enter the title, type, start date, optional end date and
                description, then save.
              </li>
              <li>
                To change one, select its day and click <Strong>Edit</Strong> or{' '}
                <Strong>Del</Strong>. Each event shows who added it.
              </li>
            </Steps>
          </>
        )}
      </Section>

      <Separator />

      {/* Staff — admin */}
      {isAdmin && (
        <>
          <Section id="staff" title={titleOf('staff')}>
            <Bullets>
              <li>
                <NavLink>Staff</NavLink> lists every staff member. Filter by
                department or status, use the switch to activate or deactivate,
                and click <Strong>Add Staff</Strong> to create a profile (and
                login).
              </li>
              <li>
                A staff profile holds personal, contact and emergency details,
                qualifications, bank/UPI details, default{' '}
                <Strong>check-in/out times</Strong> (pre-filled when marking
                staff attendance) and the <Strong>salary structure</Strong>{' '}
                (basic, allowances, deductions) used by payroll.
              </li>
              <li>
                Profile tabs: <Strong>Profile</Strong>, <Strong>Salary</Strong>,{' '}
                <Strong>Attendance</Strong> (with leave balance) and{' '}
                <Strong>Documents</Strong>.
              </li>
              <li>
                On the <Strong>Salary</Strong> tab, record a{' '}
                <Strong>salary hike</Strong>: the old salary, the dates it
                applied and the new salary. It is a record only; update the
                salary structure separately for payroll to change.
              </li>
            </Bullets>
          </Section>

          <Separator />
        </>
      )}

      {/* Staff Attendance — admin */}
      {isAdmin && (
        <>
          <Section id="staff-attendance" title={titleOf('staff-attendance')}>
            <SubHeading first>Marking</SubHeading>
            <Steps>
              <li>
                Go to <NavLink>Staff Attendance</NavLink> →{' '}
                <Strong>Mark Attendance</Strong>, pick a date and click{' '}
                <Strong>Load Staff</Strong>.
              </li>
              <li>
                Choose <Strong>P</Strong> (Present), <Strong>A</Strong>{' '}
                (Absent), <Strong>L</Strong> (Late), <Strong>CL</Strong> (Casual
                leave) or <Strong>SL</Strong> (Sick leave). Adjust check-in/out
                times and add notes if needed.
              </li>
              <li>
                Click <Strong>Save Attendance</Strong>.
              </li>
            </Steps>

            <SubHeading>History</SubHeading>
            <Bullets>
              <li>
                <Strong>View History</Strong> filters by staff, status or date.
                Badges total Present, Absent, Late and Leave, and the{' '}
                <Strong>Marked by</Strong> column shows who saved each record.
              </li>
            </Bullets>

            <SubHeading>Leave balances</SubHeading>
            <Bullets>
              <li>
                Each school year (May to April) staff get{' '}
                <Strong>12 casual</Strong> and <Strong>6 sick</Strong> leave.
                For 2026-27 the allowance started on 1 October 2026 at{' '}
                <Strong>8 casual</Strong> and <Strong>6 sick</Strong>.
              </li>
              <li>
                Only <Strong>CL</Strong> and <Strong>SL</Strong> count against
                the balance; <Strong>A</Strong> (Absent) never does.
              </li>
              <li>
                Balances show in the <Strong>Leave used</Strong> column while
                marking and on the staff profile&apos;s Attendance tab. Staff
                see their own on <NavLink>My Attendance</NavLink>.
              </li>
              <li>
                Leave saved before CL/SL existed shows as{' '}
                <Strong>leave (no type)</Strong> and isn&apos;t counted. Load
                that date, choose CL or SL and save.
              </li>
            </Bullets>
          </Section>

          <Separator />
        </>
      )}

      {/* Staff Salaries — admin */}
      {isAdmin && (
        <>
          <Section id="salaries" title={titleOf('salaries')}>
            <Steps>
              <li>
                In <NavLink>Staff Salaries</NavLink>, choose a month and click{' '}
                <Strong>Run Payroll</Strong>. It creates a pending salary record
                for each active staff member from their salary structure.
                Running it again only adds missing records.
              </li>
              <li>
                Click <Strong>Edit</Strong> on a record to adjust it, or add a
                one-off record with <Strong>New Salary Record</Strong>.
              </li>
              <li>
                Mark salaries paid one at a time or select several and{' '}
                <Strong>Mark salaries as paid</Strong> with the paid date and
                method.
              </li>
              <li>
                Open a <Strong>slip</Strong> to print or save it as a PDF. Staff
                see their own records and slips on <Strong>My Salaries</Strong>.
              </li>
            </Steps>
          </Section>

          <Separator />
        </>
      )}

      {/* Expenses — admin */}
      {isAdmin && (
        <>
          <Section id="expenses" title={titleOf('expenses')}>
            <Bullets>
              <li>
                <NavLink>Expenses</NavLink> shows cards for total income,
                expenses and balance.
              </li>
              <li>
                Click <Strong>Add Transaction</Strong> to record an expense or
                income: category, amount, date, vendor, payment method, receipt
                number and notes. Switching the type changes the category list.
              </li>
              <li>
                Filter by date range, month, category, vendor or method. Each
                entry shows who added it.
              </li>
            </Bullets>
          </Section>

          <Separator />
        </>
      )}

      {/* Classes — admin */}
      {isAdmin && (
        <>
          <Section id="classes" title={titleOf('classes')}>
            <Bullets>
              <li>
                In <NavLink>Classes</NavLink>, click <Strong>Add Class</Strong>{' '}
                and enter the name (e.g. &quot;Nursery&quot;), section, academic
                year and capacity.
              </li>
              <li>
                <Strong>Edit</Strong> or <Strong>Delete</Strong> a class from
                its row.
              </li>
            </Bullets>
            <Tip>
              Create classes before assigning students or marking attendance.
              Bulk fees use the class&apos;s academic year to decide which
              concession plans apply.
            </Tip>
          </Section>

          <Separator />
        </>
      )}

      {/* Users — admin */}
      {isAdmin && (
        <>
          <Section id="users" title={titleOf('users')}>
            <Bullets>
              <li>
                <NavLink>Users</NavLink> lists every login. Search, or filter by
                role.
              </li>
              <li>
                Click <Strong>Create User</Strong> to add a login. Public
                sign-up is closed, so accounts are created here (staff logins
                also by Add Staff). Then link a parent&apos;s login from the
                student&apos;s page.
              </li>
              <li>
                Change a role from the row&apos;s <Strong>Actions</Strong> menu:
                <ul className="mt-1 ml-5 list-disc space-y-1">
                  <li>
                    <Strong>Admin</Strong>: everything.
                  </li>
                  <li>
                    <Strong>Staff</Strong>: student attendance, students,
                    calendar, enquiries and submissions; no fees.
                  </li>
                  <li>
                    <Strong>Student</Strong>: parents and students; sees only
                    linked children.
                  </li>
                  <li>
                    <Strong>Auditor</Strong>: view-only access to reports, for
                    trustees.
                  </li>
                </ul>
              </li>
              <li>
                The <Strong>Linked Students</Strong> column shows which children
                each parent account can see.
              </li>
            </Bullets>
          </Section>

          <Separator />
        </>
      )}

      {/* Gallery — admin */}
      {isAdmin && (
        <>
          <Section id="gallery" title={titleOf('gallery')}>
            <Bullets>
              <li>
                The public gallery shows the photos in the storage bucket&apos;s{' '}
                <Strong>gallery/</Strong> folder. A loose photo is a single
                card; each subfolder becomes an event card named after the
                folder (&quot;Founders-Day-26&quot; → &quot;Founders Day
                26&quot;).
              </li>
              <li>
                In <NavLink>Gallery</NavLink>, use the arrows to set the order
                of the top level or of a folder, then click{' '}
                <Strong>Save order</Strong>. The first photo in a folder is its
                cover.
              </li>
              <li>
                Anything not ordered follows date order: new uploads appear at
                the top, and new photos at the end of their folder.{' '}
                <Strong>Back to date order</Strong> clears a saved order.
              </li>
            </Bullets>
          </Section>

          <Separator />
        </>
      )}

      {/* Profile */}
      <Section id="profile" title={titleOf('profile')}>
        <Bullets>
          <li>
            In <NavLink>Profile</NavLink>, update your name and photo under{' '}
            <Strong>Account</Strong> and click <Strong>Save Changes</Strong>.
          </li>
          <li>
            <Strong>Change Password</Strong> needs your current password and a
            new one of at least 10 characters.
          </li>
          <li>
            <Strong>Preferences</Strong> (saved on this device): theme, rows per
            table, compact or comfortable density, date format, whether the
            sidebar starts open, and the page you land on after signing in.
          </li>
          {isParent && (
            <li>
              <Strong>Linked Children</Strong> lists the student profiles
              connected to your account. Ask the school office if a child is
              missing.
            </li>
          )}
        </Bullets>
      </Section>

      <Separator />

      {/* General tips */}
      <Section id="tips" title={titleOf('tips')}>
        <Bullets>
          <li>
            Click a column header to sort a table; click again to reverse.
          </li>
          <li>
            Filters above a table narrow it down; pagination controls are below
            it.
          </li>
          <li>
            Dates and &quot;today&quot; follow India time. The school and
            financial year runs <Strong>May to April</Strong>.
          </li>
          <li>
            Switch between light and dark mode with the theme toggle, or set it
            in Preferences.
          </li>
        </Bullets>
      </Section>
    </div>
  )
}

function Section({
  id,
  title,
  children,
}: {
  id: string
  title: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-20 space-y-3">
      <h2 className="text-xl font-semibold">{title}</h2>
      {children}
    </section>
  )
}

function SubHeading({
  first,
  children,
}: {
  first?: boolean
  children: React.ReactNode
}) {
  return (
    <h3
      className={
        first ? 'mb-2 text-sm font-semibold' : 'mt-4 mb-2 text-sm font-semibold'
      }
    >
      {children}
    </h3>
  )
}

function Steps({ children }: { children: React.ReactNode }) {
  return (
    <ol className="list-inside list-decimal space-y-2 text-sm text-muted-foreground">
      {children}
    </ol>
  )
}

function Bullets({ children }: { children: React.ReactNode }) {
  return (
    <ul className="list-inside list-disc space-y-2 text-sm text-muted-foreground">
      {children}
    </ul>
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

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
      {children}
    </kbd>
  )
}

const BADGE_TONES = {
  green: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  red: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  yellow:
    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
}

function StatusBadge({
  tone,
  children,
}: {
  tone: keyof typeof BADGE_TONES
  children: React.ReactNode
}) {
  return (
    <Badge variant="secondary" className={BADGE_TONES[tone]}>
      {children}
    </Badge>
  )
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
      <span className="font-medium text-foreground">Tip:</span> {children}
    </div>
  )
}
