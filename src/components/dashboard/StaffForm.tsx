import { useRef, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { Calendar03Icon } from 'hugeicons-react'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Image } from '#/components/ui/image'
import { Calendar } from '#/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '#/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { cn } from '#/lib/utils'
import { uploadToR2 } from '#/server/upload'

export interface StaffFormData {
  // account (only used on create)
  name: string
  email: string
  password?: string

  // profile
  staffName: string
  employeeNumber?: string | null
  photoUrl?: string | null
  designation?: string | null
  department?: string | null
  dateOfBirth?: string | null
  gender?: string | null
  bloodGroup?: string | null
  maritalStatus?: string | null
  languagesSpoken?: string[] | null
  religion?: string | null
  phone?: string | null
  alternatePhone?: string | null
  personalEmail?: string | null
  address?: string | null
  emergencyContactName?: string | null
  emergencyContactPhone?: string | null
  emergencyContactRelation?: string | null
  dateOfJoining?: string | null
  dateOfLeaving?: string | null
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
  notes?: string | null
  isActive?: boolean | null
}

type FieldValue = string | number | boolean | string[] | null

export function StaffForm({
  initialData,
  mode,
  onSubmit,
}: {
  initialData?: Partial<StaffFormData> | null
  mode: 'create' | 'edit'
  onSubmit: (data: StaffFormData) => void
}) {
  const [data, setData] = useState<StaffFormData>({
    name: '',
    email: '',
    password: '',
    staffName: '',
    ...initialData,
  })
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const update = (field: keyof StaffFormData, value: FieldValue) => {
    setData((prev) => ({ ...prev, [field]: value }))
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          const result = reader.result as string
          resolve(result.split(',')[1])
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      const result = await uploadToR2({
        data: {
          file: base64,
          fileName: file.name,
          mimeType: file.type,
          folder: 'staff',
        },
      })
      update('photoUrl', result.url)
    } catch (err) {
      console.error('Upload failed:', err)
      alert('Photo upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      ...data,
      name: data.name || data.staffName,
      staffName: data.staffName || data.name,
    })
  }

  // Totals for the salary preview
  const totalAllowances =
    (data.hra ?? 0) +
    (data.conveyanceAllowance ?? 0) +
    (data.medicalAllowance ?? 0) +
    (data.specialAllowance ?? 0) +
    (data.otherAllowances ?? 0)
  const totalDeductions =
    (data.pfDeduction ?? 0) +
    (data.professionalTax ?? 0) +
    (data.tdsDeduction ?? 0) +
    (data.otherDeductions ?? 0)
  const gross = (data.basicPay ?? 0) + totalAllowances
  const net = gross - totalDeductions

  return (
    <form id="staff-form" onSubmit={handleSubmit} className="space-y-8">
      {/* ── Identity ── */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold">Identity</h3>
        <div className="flex flex-col-reverse gap-6 sm:flex-row">
          <div className="flex-1 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>
                  Full Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  required
                  value={data.staffName}
                  onChange={(e) => {
                    update('staffName', e.target.value)
                    if (mode === 'create') update('name', e.target.value)
                  }}
                  placeholder="Full name"
                />
              </div>
              <div className="space-y-2">
                <Label>Login Email</Label>
                <Input
                  type="email"
                  value={data.email}
                  onChange={(e) => update('email', e.target.value)}
                  placeholder="user@school.example"
                />
                <p className="text-xs text-muted-foreground">
                  {mode === 'edit'
                    ? "Changing this updates the user's login credentials. Leave blank if they don't sign in."
                    : "Leave blank if this person doesn't need to sign in."}
                </p>
              </div>
              {mode === 'create' && (
                <div className="space-y-2">
                  <Label>
                    Password <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    required
                    type="password"
                    minLength={8}
                    value={data.password ?? ''}
                    onChange={(e) => update('password', e.target.value)}
                    placeholder="Minimum 8 characters"
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label>Employee Number</Label>
                <Input
                  value={data.employeeNumber ?? ''}
                  onChange={(e) => update('employeeNumber', e.target.value)}
                  placeholder="e.g. EMP0001"
                />
              </div>
              <div className="space-y-2">
                <Label>Designation</Label>
                <Input
                  value={data.designation ?? ''}
                  onChange={(e) => update('designation', e.target.value)}
                  placeholder="e.g. Principal, Teacher"
                />
              </div>
              <div className="space-y-2">
                <Label>Department</Label>
                <Select
                  value={data.department ?? ''}
                  onValueChange={(val) =>
                    update('department', (val as string) || null)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="teaching">Teaching</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="support">Support</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="w-full space-y-3 sm:w-48">
            <Label>Photo</Label>
            {data.photoUrl ? (
              <Image
                src={data.photoUrl}
                alt="Staff photo"
                width={192}
                height={192}
                className="w-full rounded-lg object-cover"
              />
            ) : (
              <div className="flex aspect-square w-full items-center justify-center rounded-lg border border-dashed bg-muted text-muted-foreground">
                <span className="text-sm">No photo</span>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handlePhotoUpload}
              className="hidden"
            />
            <p className="text-xs text-muted-foreground">Max file size: 5 MB</p>
            <div className="flex gap-2">
              <Button
                type="button"
                // variant="outline"
                size="sm"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploading
                  ? 'Uploading...'
                  : data.photoUrl
                    ? 'Change'
                    : 'Upload photo'}
              </Button>
              {data.photoUrl && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => update('photoUrl', null)}
                >
                  Remove
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Personal ── */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold">Personal</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label>Date of Birth</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !data.dateOfBirth && 'text-muted-foreground',
                  )}
                >
                  <Calendar03Icon className="mr-2 size-4" />
                  {data.dateOfBirth
                    ? format(parseISO(data.dateOfBirth), 'dd MMM yyyy')
                    : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  captionLayout="dropdown"
                  selected={
                    data.dateOfBirth ? parseISO(data.dateOfBirth) : undefined
                  }
                  onSelect={(d) =>
                    update('dateOfBirth', d ? format(d, 'yyyy-MM-dd') : null)
                  }
                  startMonth={new Date(1960, 0)}
                  endMonth={new Date(2010, 11)}
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
            <Label>Gender</Label>
            <Select
              value={data.gender ?? ''}
              onValueChange={(val) => update('gender', (val as string) || null)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="male">Male</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Blood Group</Label>
            <Input
              value={data.bloodGroup ?? ''}
              onChange={(e) => update('bloodGroup', e.target.value)}
              placeholder="e.g. A+, O-"
            />
          </div>
          <div className="space-y-2">
            <Label>Marital Status</Label>
            <Select
              value={data.maritalStatus ?? ''}
              onValueChange={(val) =>
                update('maritalStatus', (val as string) || null)
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single">Single</SelectItem>
                <SelectItem value="married">Married</SelectItem>
                <SelectItem value="divorced">Divorced</SelectItem>
                <SelectItem value="widowed">Widowed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Languages Spoken</Label>
            <Input
              value={(data.languagesSpoken ?? []).join(', ')}
              onChange={(e) =>
                update(
                  'languagesSpoken',
                  e.target.value
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean),
                )
              }
              placeholder="e.g. Kannada, English, Hindi"
            />
          </div>
          <div className="space-y-2">
            <Label>Religion</Label>
            <Input
              value={data.religion ?? ''}
              onChange={(e) => update('religion', e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* ── Contact ── */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold">Contact</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input
              value={data.phone ?? ''}
              onChange={(e) => update('phone', e.target.value)}
              placeholder="+91 98100 00000"
            />
          </div>
          <div className="space-y-2">
            <Label>Alternate Phone</Label>
            <Input
              value={data.alternatePhone ?? ''}
              onChange={(e) => update('alternatePhone', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Personal Email</Label>
            <Input
              type="email"
              value={data.personalEmail ?? ''}
              onChange={(e) => update('personalEmail', e.target.value)}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Address</Label>
            <Input
              value={data.address ?? ''}
              onChange={(e) => update('address', e.target.value)}
            />
          </div>
        </div>

        <p className="text-sm font-medium text-muted-foreground">
          Emergency Contact
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              value={data.emergencyContactName ?? ''}
              onChange={(e) => update('emergencyContactName', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input
              value={data.emergencyContactPhone ?? ''}
              onChange={(e) => update('emergencyContactPhone', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Relation</Label>
            <Input
              value={data.emergencyContactRelation ?? ''}
              onChange={(e) =>
                update('emergencyContactRelation', e.target.value)
              }
              placeholder="e.g. Spouse, Parent"
            />
          </div>
        </div>
      </section>

      {/* ── Employment ── */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold">Employment</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label>Date of Joining</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !data.dateOfJoining && 'text-muted-foreground',
                  )}
                >
                  <Calendar03Icon className="mr-2 size-4" />
                  {data.dateOfJoining
                    ? format(parseISO(data.dateOfJoining), 'dd MMM yyyy')
                    : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  captionLayout="dropdown"
                  selected={
                    data.dateOfJoining
                      ? parseISO(data.dateOfJoining)
                      : undefined
                  }
                  onSelect={(d) =>
                    update('dateOfJoining', d ? format(d, 'yyyy-MM-dd') : null)
                  }
                  startMonth={new Date(2000, 0)}
                  endMonth={new Date(2030, 11)}
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
            <Label>Employment Type</Label>
            <Select
              value={data.employmentType ?? ''}
              onValueChange={(val) =>
                update('employmentType', (val as string) || null)
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="full-time">Full-time</SelectItem>
                <SelectItem value="part-time">Part-time</SelectItem>
                <SelectItem value="contract">Contract</SelectItem>
                <SelectItem value="intern">Intern</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Experience (years)</Label>
            <Input
              type="number"
              step="0.5"
              min="0"
              value={data.experienceYears ?? ''}
              onChange={(e) =>
                update(
                  'experienceYears',
                  e.target.value === '' ? null : Number(e.target.value),
                )
              }
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Qualifications</Label>
            <Input
              value={data.qualifications ?? ''}
              onChange={(e) => update('qualifications', e.target.value)}
              placeholder="e.g. B.Ed, M.A."
            />
          </div>
          <div className="space-y-2">
            <Label>Previous Employer</Label>
            <Input
              value={data.previousEmployer ?? ''}
              onChange={(e) => update('previousEmployer', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Aadhaar Number</Label>
            <Input
              value={data.aadhaarNumber ?? ''}
              onChange={(e) => update('aadhaarNumber', e.target.value)}
              placeholder="12-digit number"
            />
          </div>
          <div className="space-y-2">
            <Label>PAN Number</Label>
            <Input
              value={data.panNumber ?? ''}
              onChange={(e) => update('panNumber', e.target.value)}
              placeholder="e.g. ABCDE1234F"
            />
          </div>
        </div>
      </section>

      {/* ── Timings ── */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold">Timings</h3>
        <p className="text-xs text-muted-foreground">
          Used as defaults when marking staff attendance.
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>Default Check-in</Label>
            <Input
              type="time"
              value={data.defaultCheckIn ?? ''}
              onChange={(e) => update('defaultCheckIn', e.target.value || null)}
            />
          </div>
          <div className="space-y-2">
            <Label>Default Check-out</Label>
            <Input
              type="time"
              value={data.defaultCheckOut ?? ''}
              onChange={(e) =>
                update('defaultCheckOut', e.target.value || null)
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Working Days</Label>
            <Input
              value={data.workingDays ?? ''}
              onChange={(e) => update('workingDays', e.target.value)}
              placeholder="mon,tue,wed,thu,fri,sat"
            />
          </div>
        </div>
      </section>

      {/* ── Salary ── */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold">Salary Structure</h3>
        <p className="text-xs text-muted-foreground">
          All amounts are monthly. Used as the basis when generating payroll.
        </p>

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">
              Earnings
            </p>
            <MoneyField
              label="Basic Pay"
              value={data.basicPay}
              onChange={(v) => update('basicPay', v)}
            />
            <MoneyField
              label="HRA"
              value={data.hra}
              onChange={(v) => update('hra', v)}
            />
            <MoneyField
              label="Conveyance"
              value={data.conveyanceAllowance}
              onChange={(v) => update('conveyanceAllowance', v)}
            />
            <MoneyField
              label="Medical"
              value={data.medicalAllowance}
              onChange={(v) => update('medicalAllowance', v)}
            />
            <MoneyField
              label="Special"
              value={data.specialAllowance}
              onChange={(v) => update('specialAllowance', v)}
            />
            <MoneyField
              label="Other Allowances"
              value={data.otherAllowances}
              onChange={(v) => update('otherAllowances', v)}
            />
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">
              Deductions
            </p>
            <MoneyField
              label="PF"
              value={data.pfDeduction}
              onChange={(v) => update('pfDeduction', v)}
            />
            <MoneyField
              label="Professional Tax"
              value={data.professionalTax}
              onChange={(v) => update('professionalTax', v)}
            />
            <MoneyField
              label="TDS"
              value={data.tdsDeduction}
              onChange={(v) => update('tdsDeduction', v)}
            />
            <MoneyField
              label="Other Deductions"
              value={data.otherDeductions}
              onChange={(v) => update('otherDeductions', v)}
            />
          </div>
        </div>

        <div className="rounded-md bg-muted p-3 text-sm">
          <div className="flex justify-between">
            <span>Gross earnings</span>
            <span className="font-medium">₹{gross.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span>Total deductions</span>
            <span className="font-medium">
              ₹{totalDeductions.toLocaleString()}
            </span>
          </div>
          <div className="mt-1 flex justify-between border-t pt-1 text-base">
            <span className="font-semibold">Net pay</span>
            <span className="font-semibold">₹{net.toLocaleString()}</span>
          </div>
        </div>
      </section>

      {/* ── Bank ── */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold">Payment &amp; Bank Details</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label>Payment Method</Label>
            <Select
              value={data.paymentMethod ?? ''}
              onValueChange={(val) =>
                update('paymentMethod', (val as string) || null)
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="upi">UPI</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="cheque">Cheque</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Bank Name</Label>
            <Input
              value={data.bankName ?? ''}
              onChange={(e) => update('bankName', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Account Number</Label>
            <Input
              value={data.bankAccountNumber ?? ''}
              onChange={(e) => update('bankAccountNumber', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>IFSC Code</Label>
            <Input
              value={data.ifscCode ?? ''}
              onChange={(e) => update('ifscCode', e.target.value)}
              placeholder="e.g. HDFC0001234"
            />
          </div>
          <div className="space-y-2">
            <Label>UPI ID</Label>
            <Input
              value={data.upiId ?? ''}
              onChange={(e) => update('upiId', e.target.value)}
              placeholder="name@bank"
            />
          </div>
        </div>
      </section>

      {/* ── Notes ── */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold">Notes</h3>
        <Input
          value={data.notes ?? ''}
          onChange={(e) => update('notes', e.target.value)}
          placeholder="Internal notes about this staff member"
        />
      </section>
    </form>
  )
}

function MoneyField({
  label,
  value,
  onChange,
}: {
  label: string
  value: number | null | undefined
  onChange: (v: number | null) => void
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input
        className="w-44"
        type="number"
        step="0.01"
        min="0"
        value={value ?? ''}
        onChange={(e) =>
          onChange(e.target.value === '' ? null : Number(e.target.value))
        }
      />
    </div>
  )
}
