import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import { Button } from '#/components/ui/button'
import { formatCurrency, formatDate } from '#/lib/utils'
import { SITE_TITLE } from '#/lib/site'
import { getSalarySlip } from '#/server/staff'
import BackIcon from '#/components/icons/BackIcon'
import PrintIcon from '#/components/icons/PrintIcon'

export const Route = createFileRoute(
  '/dashboard/staff_/$staffId/slip/$salaryId',
)({
  beforeLoad: ({ context, params }) => {
    const userRole =
      (context.session.user as { role?: string }).role ?? 'student'
    if (userRole === 'admin') return
    if (userRole === 'staff' && params.staffId === context.session.user.id) {
      return
    }
    throw redirect({ to: '/dashboard' })
  },
  component: SalarySlipPage,
})

interface SlipData {
  salary: {
    id: number
    userId: string
    staffName: string | null
    designation: string | null
    month: string
    basicPay: number
    allowances: number | null
    deductions: number | null
    netPay: number
    status: string
    paidDate: string | null
    paymentMethod: string | null
    notes: string | null
  }
  profile: Record<string, unknown> | null
}

function SalarySlipPage() {
  const { staffId, salaryId } = Route.useParams()
  const { session } = Route.useRouteContext()
  const userRole = (session.user as { role?: string }).role ?? 'staff'
  const isAdmin = userRole === 'admin'

  const { data, isLoading } = useQuery({
    queryKey: ['salary-slip', salaryId],
    queryFn: () =>
      getSalarySlip({
        data: { salaryId: Number(salaryId) },
      }) as Promise<SlipData | null>,
  })

  if (isLoading) return <p className="text-muted-foreground">Loading...</p>
  if (!data) return <p className="text-muted-foreground">Slip not found.</p>

  const { salary, profile } = data
  const p = (profile ?? {}) as {
    employeeNumber?: string | null
    designation?: string | null
    department?: string | null
    phone?: string | null
    personalEmail?: string | null
    dateOfJoining?: string | null
    basicPay?: number | null
    hra?: number | null
    conveyanceAllowance?: number | null
    medicalAllowance?: number | null
    specialAllowance?: number | null
    otherAllowances?: number | null
    pfDeduction?: number | null
    professionalTax?: number | null
    tdsDeduction?: number | null
    otherDeductions?: number | null
    paymentMethod?: string | null
    bankName?: string | null
    bankAccountNumber?: string | null
    ifscCode?: string | null
    upiId?: string | null
  }

  const monthLabel = (() => {
    try {
      return format(parseISO(salary.month + '-01'), 'MMMM yyyy')
    } catch {
      return salary.month
    }
  })()

  const earnings: { label: string; value: number }[] = [
    { label: 'Basic Pay', value: p.basicPay ?? 0 },
    { label: 'HRA', value: p.hra ?? 0 },
    { label: 'Conveyance Allowance', value: p.conveyanceAllowance ?? 0 },
    { label: 'Medical Allowance', value: p.medicalAllowance ?? 0 },
    { label: 'Special Allowance', value: p.specialAllowance ?? 0 },
    { label: 'Other Allowances', value: p.otherAllowances ?? 0 },
  ].filter((e) => e.value > 0)

  const deductions: { label: string; value: number }[] = [
    { label: 'Provident Fund', value: p.pfDeduction ?? 0 },
    { label: 'Professional Tax', value: p.professionalTax ?? 0 },
    { label: 'TDS', value: p.tdsDeduction ?? 0 },
    { label: 'Other Deductions', value: p.otherDeductions ?? 0 },
  ].filter((d) => d.value > 0)

  const totalEarnings = earnings.reduce((s, e) => s + e.value, 0)
  const totalDeductions = deductions.reduce((s, d) => s + d.value, 0)
  const netPay = totalEarnings - totalDeductions

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-3">
          {isAdmin ? (
            <Link to="/dashboard/staff/$staffId" params={{ staffId }}>
              <Button variant="outline" size="sm">
                <BackIcon className="h-4 w-4" />
                Back
              </Button>
            </Link>
          ) : (
            <Link to="/dashboard/my-salaries">
              <Button variant="outline" size="sm">
                <BackIcon className="h-4 w-4" />
                Back
              </Button>
            </Link>
          )}
          <h1 className="text-xl font-bold">
            Salary Slip · {salary.staffName} · {monthLabel}
          </h1>
        </div>
        <Button onClick={() => window.print()}>
          <PrintIcon className="h-4 w-4" /> Print / Save as PDF
        </Button>
      </div>

      <div className="mx-auto max-w-3xl rounded-lg border bg-white p-8 text-black shadow-sm print:border-0 print:shadow-none">
        <div className="flex items-start justify-between border-b border-gray-300 pb-4">
          <div>
            <h2 className="text-2xl font-bold">{SITE_TITLE}</h2>
            <p className="text-sm text-gray-600">Payslip for {monthLabel}</p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-gray-500">
              Status
            </p>
            <p className="text-sm font-semibold capitalize">{salary.status}</p>
            {salary.paidDate && (
              <p className="mt-1 text-xs text-gray-500">
                Paid on {formatDate(salary.paidDate)}
              </p>
            )}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs uppercase text-gray-500">Employee Name</p>
            <p className="font-medium">{salary.staffName}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-gray-500">Employee Number</p>
            <p className="font-medium">{p.employeeNumber ?? '-'}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-gray-500">Designation</p>
            <p className="font-medium">
              {salary.designation ?? p.designation ?? '-'}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase text-gray-500">Department</p>
            <p className="font-medium capitalize">{p.department ?? '-'}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-gray-500">Date of Joining</p>
            <p className="font-medium">{formatDate(p.dateOfJoining)}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-gray-500">Pay Period</p>
            <p className="font-medium">{monthLabel}</p>
          </div>
          {p.bankName && (
            <div>
              <p className="text-xs uppercase text-gray-500">Bank</p>
              <p className="font-medium">{p.bankName}</p>
            </div>
          )}
          {p.bankAccountNumber && (
            <div>
              <p className="text-xs uppercase text-gray-500">Account Number</p>
              <p className="font-medium">{p.bankAccountNumber}</p>
            </div>
          )}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-6">
          <div>
            <h3 className="border-b border-gray-300 pb-1 text-sm font-semibold uppercase tracking-wide text-gray-700">
              Earnings
            </h3>
            <div className="mt-2 flex flex-col gap-3 text-sm">
              {earnings.length === 0 && (
                <p className="py-2 text-gray-500">No earnings recorded</p>
              )}
              {earnings.map((e) => (
                <div key={e.label}>
                  <p className="text-xs uppercase text-gray-500">{e.label}</p>
                  <p className="font-medium tabular-nums">
                    {formatCurrency(e.value)}
                  </p>
                </div>
              ))}
              <div className="mt-2 flex items-center justify-between border-t border-gray-300 pt-2 font-semibold">
                <span>Gross Earnings</span>
                <span className="tabular-nums">
                  {formatCurrency(totalEarnings)}
                </span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="border-b border-gray-300 pb-1 text-sm font-semibold uppercase tracking-wide text-gray-700">
              Deductions
            </h3>
            <div className="mt-2 flex flex-col gap-3 text-sm">
              {deductions.length === 0 && (
                <p className="py-2 text-gray-500">No deductions</p>
              )}
              {deductions.map((d) => (
                <div key={d.label}>
                  <p className="text-xs uppercase text-gray-500">{d.label}</p>
                  <p className="font-medium tabular-nums">
                    {formatCurrency(d.value)}
                  </p>
                </div>
              ))}
              <div className="mt-2 flex items-center justify-between border-t border-gray-300 pt-2 font-semibold">
                <span>Total Deductions</span>
                <span className="tabular-nums">
                  {formatCurrency(totalDeductions)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-md bg-gray-100 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold uppercase tracking-wide text-gray-700">
              Net Pay
            </span>
            <span className="text-2xl font-bold">{formatCurrency(netPay)}</span>
          </div>
          {salary.paymentMethod && (
            <p className="mt-1 text-xs capitalize text-gray-600">
              Paid via {salary.paymentMethod.replace('_', ' ')}
            </p>
          )}
        </div>

        <p className="mt-8 text-center text-xs text-gray-500">
          This is a computer-generated payslip and does not require a signature.
        </p>
      </div>

      <style>{`
        @media print {
          body { background: white !important; }
          aside, header, nav, footer { display: none !important; }
        }
      `}</style>
    </div>
  )
}
