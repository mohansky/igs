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
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '#/components/ui/alert-dialog'
import { IconButton } from '#/components/dashboard/IconButton'
import { CustomDataTable } from '#/components/dashboard/CustomDataTable'
import { formatCurrency, formatDate } from '#/lib/utils'
import { StaffForm, type StaffFormData } from '#/components/dashboard/StaffForm'
import {
  getStaffProfile,
  updateStaffProfile,
  updateStaffLoginEmail,
  getStaffSalaryHistory,
  getStaffAttendanceHistory,
  listSalaryHikes,
  createSalaryHike,
  deleteSalaryHike,
} from '#/server/staff'
import { displayEmail, isPlaceholderEmail } from '#/lib/email'
import { AttachmentsSection } from '#/components/dashboard/AttachmentsSection'
import EditIcon from '#/components/icons/EditIcon'
import SaveIcon from '#/components/icons/SaveIcon'
import AddIcon from '#/components/icons/AddIcon'
import TrashIcon from '#/components/icons/TrashIcon'
import { getLeaveBalances } from '#/server/staff-attendance'
import { LeaveBalance } from '#/components/dashboard/LeaveBalance'
import { attendanceStatusLabel } from '#/lib/leave-policy'
import type { LeaveBalances } from '#/server/staff-attendance'

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
  leaveType: string | null
  checkIn: string | null
  checkOut: string | null
  notes: string | null
}

interface SalaryHikeRow {
  id: number
  userId: string
  oldSalary: number
  newSalary: number | null
  effectiveFrom: string
  effectiveTo: string
  notes: string | null
  createdByName: string | null
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

  const { data: leave } = useQuery({
    queryKey: ['leave-balances', 'staff', staffId],
    queryFn: () => getLeaveBalances({ data: { userId: staffId } }),
  })

  const { data: salaryHikes = [] } = useQuery({
    queryKey: ['staff', staffId, 'salaryHikes'],
    queryFn: () =>
      listSalaryHikes({ data: { userId: staffId } }) as Promise<
        SalaryHikeRow[]
      >,
  })

  const [hikeDialogOpen, setHikeDialogOpen] = useState(false)
  const [deleteHikeTarget, setDeleteHikeTarget] =
    useState<SalaryHikeRow | null>(null)

  const invalidateHikes = () =>
    queryClient.invalidateQueries({
      queryKey: ['staff', staffId, 'salaryHikes'],
    })

  const createHikeMutation = useMutation({
    mutationFn: (data: {
      oldSalary: number
      newSalary?: number
      effectiveFrom: string
      effectiveTo: string
      notes?: string
    }) => createSalaryHike({ data: { userId: staffId, ...data } }),
    onSuccess: () => {
      invalidateHikes()
      setHikeDialogOpen(false)
      toast.success('Salary hike recorded')
    },
    onError: (err: Error) =>
      toast.error(err.message || 'Failed to record salary hike'),
  })

  const deleteHikeMutation = useMutation({
    mutationFn: (id: number) => deleteSalaryHike({ data: { id } }),
    onSuccess: () => {
      invalidateHikes()
      setDeleteHikeTarget(null)
      toast.success('Salary hike record deleted')
    },
    onError: (err: Error) =>
      toast.error(err.message || 'Failed to delete record'),
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
          <SalaryHikesCard
            hikes={salaryHikes}
            currentSalary={p.basicPay ?? undefined}
            onAdd={() => setHikeDialogOpen(true)}
            onDelete={(hike) => setDeleteHikeTarget(hike)}
          />
          <SalaryHistoryTable rows={salaryHistory} staffId={staffId} />
        </TabsContent>

        <TabsContent value="attendance" className="space-y-4">
          <LeaveBalanceCard leave={leave} />
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

      {/* Record salary hike */}
      <HikeFormDialog
        open={hikeDialogOpen}
        onOpenChange={setHikeDialogOpen}
        defaultOldSalary={p.basicPay ?? undefined}
        onSubmit={(hikeData) => createHikeMutation.mutate(hikeData)}
        loading={createHikeMutation.isPending}
      />

      {/* Delete hike confirmation */}
      <AlertDialog
        open={!!deleteHikeTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteHikeTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Salary Hike Record</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the record only — it does not change the
              staff&apos;s current salary or any generated payroll. This
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() =>
                deleteHikeTarget && deleteHikeMutation.mutate(deleteHikeTarget.id)
              }
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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

function SalaryHikesCard({
  hikes,
  currentSalary,
  onAdd,
  onDelete,
}: {
  hikes: SalaryHikeRow[]
  currentSalary?: number
  onAdd: () => void
  onDelete: (hike: SalaryHikeRow) => void
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Salary Hikes</CardTitle>
        <Button size="sm" onClick={onAdd}>
          <AddIcon className="h-3 w-3" />
          <span>Record Hike</span>
        </Button>
      </CardHeader>
      <CardContent>
        {hikes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No salary hikes recorded yet.
          </p>
        ) : (
          <div className="space-y-2">
            {hikes.map((h) => (
              <div
                key={h.id}
                className="flex items-center justify-between gap-3 rounded-md border p-3"
              >
                <div>
                  <p className="text-sm font-medium">
                    {formatCurrency(h.oldSalary)}
                    {h.newSalary != null && (
                      <>
                        {' '}
                        <span className="text-muted-foreground">→</span>{' '}
                        {formatCurrency(h.newSalary)}
                      </>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Old salary applied {formatDate(h.effectiveFrom)} –{' '}
                    {formatDate(h.effectiveTo)}
                  </p>
                  {h.notes && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {h.notes}
                    </p>
                  )}
                  {h.createdByName && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Recorded by {h.createdByName}
                    </p>
                  )}
                </div>
                <IconButton
                  tooltip="Delete"
                  icon={TrashIcon}
                  className="text-destructive"
                  size="xs"
                  onClick={() => onDelete(h)}
                />
              </div>
            ))}
          </div>
        )}
        {currentSalary != null && (
          <p className="mt-3 text-xs text-muted-foreground">
            Current basic pay: {formatCurrency(currentSalary)} — a
            record-keeping log only; it does not affect generated payroll.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function HikeFormDialog({
  open,
  onOpenChange,
  defaultOldSalary,
  onSubmit,
  loading,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultOldSalary?: number
  onSubmit: (data: {
    oldSalary: number
    newSalary?: number
    effectiveFrom: string
    effectiveTo: string
    notes?: string
  }) => void
  loading: boolean
}) {
  const [oldSalary, setOldSalary] = useState('')
  const [newSalary, setNewSalary] = useState('')
  const [effectiveFrom, setEffectiveFrom] = useState('')
  const [effectiveTo, setEffectiveTo] = useState('')
  const [notes, setNotes] = useState('')

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setOldSalary(defaultOldSalary != null ? String(defaultOldSalary) : '')
      setNewSalary('')
      setEffectiveFrom('')
      setEffectiveTo('')
      setNotes('')
    }
    onOpenChange(nextOpen)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      oldSalary: Number(oldSalary),
      newSalary: newSalary ? Number(newSalary) : undefined,
      effectiveFrom,
      effectiveTo,
      notes: notes || undefined,
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Salary Hike</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Old Salary</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                required
                value={oldSalary}
                onChange={(e) => setOldSalary(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>New Salary (optional)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={newSalary}
                onChange={(e) => setNewSalary(e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Old Salary Effective From</Label>
              <Input
                type="date"
                required
                value={effectiveFrom}
                onChange={(e) => setEffectiveFrom(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Old Salary Effective Until</Label>
              <Input
                type="date"
                required
                value={effectiveTo}
                onChange={(e) => setEffectiveTo(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Annual increment"
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Saving...' : 'Record Hike'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
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

function LeaveBalanceCard({ leave }: { leave?: LeaveBalances }) {
  if (!leave?.policy) return null
  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle className="text-base">Leave this school year</CardTitle>
      </CardHeader>
      <CardContent>
        <LeaveBalance policy={leave.policy} used={leave.used[0]} />
      </CardContent>
    </Card>
  )
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
            {attendanceStatusLabel(s, row.original.leaveType)}
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
