import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { ColumnDef } from '@tanstack/react-table'
import { format, parseISO } from 'date-fns'
import { Button } from '#/components/ui/button'
import { Badge } from '#/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Image } from '#/components/ui/image'
import { CustomDataTable } from '#/components/dashboard/CustomDataTable'
import { formatCurrency, formatDate } from '#/lib/utils'
import { StaffForm, type StaffFormData } from '#/components/dashboard/StaffForm'
import {
  getStaffProfile,
  updateStaffProfile,
  updateStaffLoginEmail,
  getStaffSalaryHistory,
  getStaffAttendanceHistory,
} from '#/server/staff'
import { displayEmail, isPlaceholderEmail } from '#/lib/email'
import { AttachmentsSection } from '#/components/dashboard/AttachmentsSection'
import EditIcon from '#/components/icons/EditIcon'
import SaveIcon from '#/components/icons/SaveIcon'

export const Route = createFileRoute('/dashboard/staff/$staffId')({
  beforeLoad: ({ context }) => {
    const userRole =
      (context.session.user as { role?: string }).role ?? 'student'
    if (userRole !== 'admin') {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: StaffDetailPage,
})

interface StaffResponse {
  user: { id: string; name: string; email: string; role: string | null }
  profile: Record<string, unknown> | null
}

interface SalaryRow {
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
}

interface AttendanceRow {
  id: number
  date: string
  status: string
  checkIn: string | null
  checkOut: string | null
  notes: string | null
}

function StaffDetailPage() {
  const { staffId } = Route.useParams()
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['staff', staffId],
    queryFn: () =>
      getStaffProfile({
        data: { userId: staffId },
      }) as Promise<StaffResponse | null>,
  })

  const { data: salaryHistory = [] } = useQuery({
    queryKey: ['staff', staffId, 'salaries'],
    queryFn: () =>
      getStaffSalaryHistory({ data: { userId: staffId } }) as Promise<
        SalaryRow[]
      >,
  })

  const { data: attendanceHistory = [] } = useQuery({
    queryKey: ['staff', staffId, 'attendance'],
    queryFn: () =>
      getStaffAttendanceHistory({ data: { userId: staffId } }) as Promise<
        AttendanceRow[]
      >,
  })

  const updateMutation = useMutation({
    mutationFn: async (updates: StaffFormData) => {
      const currentEmail = data?.user.email ?? ''
      const newEmail = updates.email.trim().toLowerCase()
      if (newEmail !== currentEmail.toLowerCase()) {
        await updateStaffLoginEmail({
          data: { userId: staffId, email: newEmail },
        })
      }
      return updateStaffProfile({
        data: {
          userId: staffId,
          updates: updates as unknown as Record<string, unknown>,
        },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff', staffId] })
      queryClient.invalidateQueries({ queryKey: ['staff'] })
      toast.success('Staff profile updated')
      setEditing(false)
    },
    onError: (err: Error) =>
      toast.error(err.message || 'Failed to update staff profile'),
  })

  if (isLoading) {
    return <p className="text-muted-foreground">Loading...</p>
  }

  if (!data) {
    return <p className="text-muted-foreground">Staff member not found.</p>
  }

  const profile = (data.profile ?? {}) as Record<string, unknown>
  const p = profile as {
    staffName?: string
    employeeNumber?: string | null
    designation?: string | null
    department?: string | null
    photoUrl?: string | null
    phone?: string | null
    alternatePhone?: string | null
    personalEmail?: string | null
    address?: string | null
    dateOfBirth?: string | null
    gender?: string | null
    bloodGroup?: string | null
    maritalStatus?: string | null
    languagesSpoken?: string[] | null
    religion?: string | null
    emergencyContactName?: string | null
    emergencyContactPhone?: string | null
    emergencyContactRelation?: string | null
    dateOfJoining?: string | null
    employmentType?: string | null
    qualifications?: string | null
    experienceYears?: number | null
    previousEmployer?: string | null
    aadhaarNumber?: string | null
    panNumber?: string | null
    defaultCheckIn?: string | null
    defaultCheckOut?: string | null
    workingDays?: string | null
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
    isActive?: boolean | null
    notes?: string | null
  }
  const displayName = p.staffName ?? data.user.name

  if (editing) {
    const initialData: Partial<StaffFormData> = {
      name: data.user.name,
      email: isPlaceholderEmail(data.user.email) ? '' : data.user.email,
      staffName: p.staffName ?? data.user.name,
      ...p,
    }
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Edit Staff</h1>
          <div className="flex gap-2">
            <Button variant="destructive" onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="staff-form"
              disabled={updateMutation.isPending}
            >
              <SaveIcon className="h-4 w-4" />
              {updateMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
        <StaffForm
          mode="edit"
          initialData={initialData}
          onSubmit={(updates) => updateMutation.mutate(updates)}
        />
      </div>
    )
  }

  const grossEarnings =
    (p.basicPay ?? 0) +
    (p.hra ?? 0) +
    (p.conveyanceAllowance ?? 0) +
    (p.medicalAllowance ?? 0) +
    (p.specialAllowance ?? 0) +
    (p.otherAllowances ?? 0)
  const totalDeductions =
    (p.pfDeduction ?? 0) +
    (p.professionalTax ?? 0) +
    (p.tdsDeduction ?? 0) +
    (p.otherDeductions ?? 0)
  const netPay = grossEarnings - totalDeductions

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-6">
        {p.photoUrl ? (
          <Image
            src={p.photoUrl}
            alt={displayName}
            width={192}
            height={192}
            className="size-24 rounded-lg border object-cover"
          />
        ) : (
          <div className="flex size-24 items-center justify-center rounded-lg border bg-muted text-2xl font-bold text-muted-foreground">
            {displayName
              .split(' ')
              .map((n) => n[0])
              .join('')
              .slice(0, 2)
              .toUpperCase()}
          </div>
        )}
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{displayName}</h1>
            {p.employeeNumber && (
              <Badge variant="outline">#{p.employeeNumber}</Badge>
            )}
            {p.isActive === false && (
              <Badge variant="destructive">Inactive</Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {p.designation ?? 'Staff'}
            {p.department ? ` · ${p.department}` : ''}
            {p.dateOfJoining ? ` · Joined ${formatDate(p.dateOfJoining)}` : ''}
          </p>
          <p className="text-sm text-muted-foreground">
            {displayEmail(data.user.email) || 'No login email'}
          </p>
          <Button size="sm" className="mt-3" onClick={() => setEditing(true)}>
            <EditIcon className="h-4 w-4" />
            Edit Profile
          </Button>
        </div>
      </div>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="salary">Salary</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Personal</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                <InfoRow
                  label="Date of Birth"
                  value={formatDate(p.dateOfBirth)}
                />
                <InfoRow label="Gender" value={p.gender} />
                <InfoRow label="Blood Group" value={p.bloodGroup} />
                <InfoRow label="Marital Status" value={p.maritalStatus} />
                <InfoRow
                  label="Languages Spoken"
                  value={(p.languagesSpoken ?? []).join(', ') || null}
                />
                <InfoRow label="Religion" value={p.religion} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Contact</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                <InfoRow label="Phone" value={p.phone} />
                <InfoRow label="Alternate Phone" value={p.alternatePhone} />
                <InfoRow label="Personal Email" value={p.personalEmail} />
                <InfoRow label="Address" value={p.address} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Emergency Contact</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                <InfoRow label="Name" value={p.emergencyContactName} />
                <InfoRow label="Phone" value={p.emergencyContactPhone} />
                <InfoRow label="Relation" value={p.emergencyContactRelation} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Employment</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                <InfoRow
                  label="Date of Joining"
                  value={formatDate(p.dateOfJoining)}
                />
                <InfoRow label="Employment Type" value={p.employmentType} />
                <InfoRow label="Qualifications" value={p.qualifications} />
                <InfoRow
                  label="Experience"
                  value={
                    p.experienceYears != null
                      ? `${p.experienceYears} years`
                      : null
                  }
                />
                <InfoRow label="Previous Employer" value={p.previousEmployer} />
                <InfoRow label="Aadhaar" value={p.aadhaarNumber} />
                <InfoRow label="PAN" value={p.panNumber} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Timings</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                <InfoRow label="Check-in" value={p.defaultCheckIn} />
                <InfoRow label="Check-out" value={p.defaultCheckOut} />
                <InfoRow label="Working Days" value={p.workingDays} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Bank &amp; Payment</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                <InfoRow label="Method" value={p.paymentMethod} />
                <InfoRow label="Bank" value={p.bankName} />
                <InfoRow label="Account #" value={p.bankAccountNumber} />
                <InfoRow label="IFSC" value={p.ifscCode} />
                <InfoRow label="UPI" value={p.upiId} />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Salary Structure</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    Earnings
                  </p>
                  <InfoRow
                    label="Basic Pay"
                    value={formatCurrency(p.basicPay ?? 0)}
                  />
                  <InfoRow label="HRA" value={formatCurrency(p.hra ?? 0)} />
                  <InfoRow
                    label="Conveyance"
                    value={formatCurrency(p.conveyanceAllowance ?? 0)}
                  />
                  <InfoRow
                    label="Medical"
                    value={formatCurrency(p.medicalAllowance ?? 0)}
                  />
                  <InfoRow
                    label="Special"
                    value={formatCurrency(p.specialAllowance ?? 0)}
                  />
                  <InfoRow
                    label="Other"
                    value={formatCurrency(p.otherAllowances ?? 0)}
                  />
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    Deductions
                  </p>
                  <InfoRow
                    label="PF"
                    value={formatCurrency(p.pfDeduction ?? 0)}
                  />
                  <InfoRow
                    label="Professional Tax"
                    value={formatCurrency(p.professionalTax ?? 0)}
                  />
                  <InfoRow
                    label="TDS"
                    value={formatCurrency(p.tdsDeduction ?? 0)}
                  />
                  <InfoRow
                    label="Other"
                    value={formatCurrency(p.otherDeductions ?? 0)}
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    Summary
                  </p>
                  <InfoRow
                    label="Gross"
                    value={formatCurrency(grossEarnings)}
                  />
                  <InfoRow
                    label="Deductions"
                    value={formatCurrency(totalDeductions)}
                  />
                  <InfoRow label="Net Pay" value={formatCurrency(netPay)} />
                </div>
              </div>
            </CardContent>
          </Card>

          {p.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{p.notes}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="salary" className="space-y-4">
          <SalaryHistoryTable rows={salaryHistory} staffId={staffId} />
        </TabsContent>

        <TabsContent value="attendance" className="space-y-4">
          <AttendanceHistoryTable rows={attendanceHistory} />
        </TabsContent>

        <TabsContent value="documents">
          {typeof profile.id === 'number' ? (
            <AttachmentsSection profileId={profile.id} entityType="staff" />
          ) : (
            <p className="text-sm text-muted-foreground">Profile not found.</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function InfoRow({
  label,
  value,
}: {
  label: string
  value?: string | number | null
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">
        {value != null && value !== '' ? value : '-'}
      </p>
    </div>
  )
}

function SalaryHistoryTable({
  rows,
  staffId,
}: {
  rows: SalaryRow[]
  staffId: string
}) {
  const columns: ColumnDef<SalaryRow>[] = [
    {
      accessorKey: 'month',
      header: 'Month',
      cell: ({ row }) => {
        const m = row.getValue('month') as string
        try {
          return format(parseISO(m + '-01'), 'MMM yyyy')
        } catch {
          return m
        }
      },
    },
    {
      accessorKey: 'basicPay',
      header: 'Basic',
      cell: ({ row }) => formatCurrency(row.getValue('basicPay') as number),
    },
    {
      accessorKey: 'allowances',
      header: 'Allowances',
      cell: ({ row }) =>
        formatCurrency((row.getValue('allowances') as number | null) ?? 0),
    },
    {
      accessorKey: 'deductions',
      header: 'Deductions',
      cell: ({ row }) =>
        formatCurrency((row.getValue('deductions') as number | null) ?? 0),
    },
    {
      accessorKey: 'netPay',
      header: 'Net',
      cell: ({ row }) => (
        <span className="font-semibold">
          {formatCurrency(row.getValue('netPay') as number)}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const s = row.getValue('status') as string
        return (
          <Badge
            className="capitalize"
            variant={s === 'paid' ? 'default' : 'warning'}
          >
            {s}
          </Badge>
        )
      },
    },
    {
      id: 'slip',
      header: 'Slip',
      enableSorting: false,
      cell: ({ row }) => (
        <Link
          to="/dashboard/staff/$staffId/slip/$salaryId"
          params={{ staffId, salaryId: String(row.original.id) }}
        >
          <Button variant="outline" size="xs">
            View Slip
          </Button>
        </Link>
      ),
    },
  ]

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No salary records yet. Generate payroll from the Salaries page.
      </p>
    )
  }

  return <CustomDataTable columns={columns} data={rows} />
}

function AttendanceHistoryTable({ rows }: { rows: AttendanceRow[] }) {
  const statusVariant = (s: string) => {
    switch (s) {
      case 'present':
        return 'default' as const
      case 'absent':
        return 'destructive' as const
      case 'late':
        return 'warning' as const
      case 'leave':
        return 'success' as const
      default:
        return 'outline' as const
    }
  }

  const columns: ColumnDef<AttendanceRow>[] = [
    {
      accessorKey: 'date',
      header: 'Date',
      cell: ({ row }) => formatDate(row.getValue('date')),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const s = row.getValue('status') as string
        return (
          <Badge className="capitalize" variant={statusVariant(s)}>
            {s}
          </Badge>
        )
      },
      filterFn: (row, _id, value) => {
        if (!value || value === 'all') return true
        return row.getValue('status') === value
      },
    },
    {
      accessorKey: 'checkIn',
      header: 'Check In',
      cell: ({ row }) => row.getValue('checkIn') ?? '-',
    },
    {
      accessorKey: 'checkOut',
      header: 'Check Out',
      cell: ({ row }) => row.getValue('checkOut') ?? '-',
    },
    {
      accessorKey: 'notes',
      header: 'Notes',
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {(row.getValue('notes') as string | null) ?? '-'}
        </span>
      ),
    },
  ]

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No attendance records.</p>
    )
  }

  return (
    <CustomDataTable
      columns={columns}
      data={rows}
      showDatePicker
      dateField="date"
      filters={[
        {
          column: 'status',
          placeholder: 'Filter by status',
          type: 'select',
          options: [
            { label: 'All', value: 'all' },
            { label: 'Present', value: 'present' },
            { label: 'Absent', value: 'absent' },
            { label: 'Late', value: 'late' },
            { label: 'Leave', value: 'leave' },
          ],
        },
      ]}
    />
  )
}
