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

export interface ProfileData {
  studentName: string
  userId?: string | null
  classId?: number | null
  currentClassId?: number | null
  dateOfBirth?: string | null
  gender?: string | null
  bloodGroup?: string | null
  admissionDate?: string | null
  admissionNumber?: string | null
  photoUrl?: string | null
  parentName?: string | null
  parentRelation?: string | null
  parentPhone?: string | null
  parentEmail?: string | null
  parentOccupation?: string | null
  parent2Name?: string | null
  parent2Relation?: string | null
  parent2Phone?: string | null
  parent2Email?: string | null
  parent2Occupation?: string | null
  parent3Name?: string | null
  parent3Relation?: string | null
  parent3Phone?: string | null
  parent3Email?: string | null
  parent3Occupation?: string | null
  emergencyContact?: string | null
  emergencyPhone?: string | null
  address?: string | null
  languagesSpoken?: string[] | null
  religion?: string | null
  caste?: string | null
  aadhaarNumber?: string | null
  previousSchool?: string | null
  transferCertificateNumber?: string | null
  transportMode?: string | null
  transportRoute?: string | null
  transportPickupPerson?: string | null
  transportPickupPhone?: string | null
  transportDropPerson?: string | null
  transportDropPhone?: string | null
  medicalNotes?: string | null
  allergies?: string | null
}

interface ClassItem {
  id: number
  name: string
  section: string | null
  academicYear: string | null
}

export function StudentProfileForm({
  initialData,
  classes,
  onSubmit,
  isPending,
}: {
  initialData?: Partial<ProfileData> | null
  classes: ClassItem[]
  onSubmit: (data: ProfileData) => void
  isPending?: boolean
}) {
  const [data, setData] = useState<ProfileData>({
    studentName: '',
    ...initialData,
  })
  const [uploading, setUploading] = useState(false)
  const [parentCount, setParentCount] = useState(() => {
    if (initialData?.parent3Name) return 3
    if (initialData?.parent2Name) return 2
    return 1
  })
  const fileInputRef = useRef<HTMLInputElement>(null)

  const update = (
    field: keyof ProfileData,
    value: string | number | string[] | null,
  ) => {
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
          resolve(result.split(',')[1]) // strip data:...;base64, prefix
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      const result = await uploadToR2({
        data: {
          file: base64,
          fileName: file.name,
          mimeType: file.type,
          folder: 'students',
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
    onSubmit(data)
  }

  return (
    <form
      id="student-profile-form"
      onSubmit={handleSubmit}
      className="space-y-6"
    >
      <h3 className="text-lg font-semibold">Basic Information</h3>
      <div className="flex flex-col-reverse gap-6 sm:flex-row">
        {/* Left column — details */}
        <div className="flex-1 space-y-4">
          <div className="space-y-2">
            <Label>
              Student Name <span className="text-destructive">*</span>
            </Label>
            <Input
              required
              value={data.studentName}
              onChange={(e) => update('studentName', e.target.value)}
              placeholder="Full name"
            />
          </div>
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
                  onSelect={(date) =>
                    update(
                      'dateOfBirth',
                      date ? format(date, 'yyyy-MM-dd') : null,
                    )
                  }
                  startMonth={new Date(2005, 0)}
                  endMonth={new Date(2025, 11)}
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex gap-6">
            <div className="space-y-2">
              <Label>Gender</Label>
              <div className="flex gap-4 pt-1">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="gender"
                    value="female"
                    checked={data.gender === 'female'}
                    onChange={(e) => update('gender', e.target.value)}
                    className="accent-primary"
                  />
                  Female
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="gender"
                    value="male"
                    checked={data.gender === 'male'}
                    onChange={(e) => update('gender', e.target.value)}
                    className="accent-primary"
                  />
                  Male
                </label>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Blood Group</Label>
              <Input
                value={data.bloodGroup ?? ''}
                onChange={(e) => update('bloodGroup', e.target.value)}
                placeholder="e.g. A+, B-, O+"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Admission Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !data.admissionDate && 'text-muted-foreground',
                  )}
                >
                  <Calendar03Icon className="mr-2 size-4" />
                  {data.admissionDate
                    ? format(parseISO(data.admissionDate), 'dd MMM yyyy')
                    : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  captionLayout="dropdown"
                  selected={
                    data.admissionDate
                      ? parseISO(data.admissionDate)
                      : undefined
                  }
                  onSelect={(date) =>
                    update(
                      'admissionDate',
                      date ? format(date, 'yyyy-MM-dd') : null,
                    )
                  }
                  startMonth={new Date(2015, 0)}
                  endMonth={new Date(2026, 11)}
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
            <Label>Admission Number</Label>
            <Input
              value={data.admissionNumber ?? ''}
              onChange={(e) => update('admissionNumber', e.target.value)}
            />
          </div>
          {classes.length > 0 && (
            <>
              <div className="space-y-2">
                <Label>Admitted to class</Label>
                <Select
                  value={data.classId ? String(data.classId) : ''}
                  onValueChange={(val) =>
                    update('classId', val ? Number(val) : null)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={String(cls.id)}>
                        {cls.name}
                        {cls.section ? ` - ${cls.section}` : ''}
                        {cls.academicYear ? (
                          <span className="ml-1 font-mono text-xs text-muted-foreground">
                            {cls.academicYear}
                          </span>
                        ) : null}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Current class</Label>
                <Select
                  value={data.currentClassId ? String(data.currentClassId) : ''}
                  onValueChange={(val) =>
                    update('currentClassId', val ? Number(val) : null)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={String(cls.id)}>
                        {cls.name}
                        {cls.section ? ` - ${cls.section}` : ''}
                        {cls.academicYear ? (
                          <span className="ml-1 font-mono text-xs text-muted-foreground">
                            {cls.academicYear}
                          </span>
                        ) : null}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
          <div className="space-y-2">
            <Label>Aadhaar Number</Label>
            <Input
              value={data.aadhaarNumber ?? ''}
              onChange={(e) => update('aadhaarNumber', e.target.value)}
              placeholder="12-digit number"
            />
          </div>
          <div className="space-y-2">
            <Label>Address</Label>
            <Input
              value={data.address ?? ''}
              onChange={(e) => update('address', e.target.value)}
            />
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
        </div>

        {/* Right column — photo */}
        <div className="w-full space-y-3 sm:w-48">
          <Label>Photo</Label>
          {data.photoUrl ? (
            <Image
              src={data.photoUrl}
              alt="Student photo"
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
              variant="outline"
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

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Parent / Guardian</h3>
        {parentCount < 3 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setParentCount((c) => c + 1)}
          >
            + Add Parent
          </Button>
        )}
      </div>
      {(
        [
          { prefix: '', label: 'Parent / Guardian 1' },
          { prefix: 'parent2', label: 'Parent / Guardian 2' },
          { prefix: 'parent3', label: 'Parent / Guardian 3' },
        ] as const
      )
        .slice(0, parentCount)
        .map(({ prefix, label }, i) => {
          const nameKey = prefix
            ? (`${prefix}Name` as keyof ProfileData)
            : 'parentName'
          const relationKey = prefix
            ? (`${prefix}Relation` as keyof ProfileData)
            : 'parentRelation'
          const phoneKey = prefix
            ? (`${prefix}Phone` as keyof ProfileData)
            : 'parentPhone'
          const emailKey = prefix
            ? (`${prefix}Email` as keyof ProfileData)
            : 'parentEmail'
          const occupationKey = prefix
            ? (`${prefix}Occupation` as keyof ProfileData)
            : 'parentOccupation'

          return (
            <div key={label} className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">
                  {label}
                </p>
                {i > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => {
                      update(nameKey, null)
                      update(relationKey, null)
                      update(phoneKey, null)
                      update(emailKey, null)
                      update(occupationKey, null)
                      setParentCount((c) => {
                        // Shift parent 3 into slot 2 if removing parent 2
                        if (i === 1 && c === 3) {
                          update(nameKey, data.parent3Name ?? null)
                          update(relationKey, data.parent3Relation ?? null)
                          update(phoneKey, data.parent3Phone ?? null)
                          update(emailKey, data.parent3Email ?? null)
                          update(occupationKey, data.parent3Occupation ?? null)
                          update('parent3Name', null)
                          update('parent3Relation', null)
                          update('parent3Phone', null)
                          update('parent3Email', null)
                          update('parent3Occupation', null)
                        }
                        return c - 1
                      })
                    }}
                  >
                    Remove
                  </Button>
                )}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    value={(data[nameKey] as string) ?? ''}
                    onChange={(e) => update(nameKey, e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Relation</Label>
                  <Input
                    value={(data[relationKey] as string) ?? ''}
                    onChange={(e) => update(relationKey, e.target.value)}
                    placeholder="e.g. Father, Mother, Guardian"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    value={(data[phoneKey] as string) ?? ''}
                    onChange={(e) => update(phoneKey, e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={(data[emailKey] as string) ?? ''}
                    onChange={(e) => update(emailKey, e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Occupation</Label>
                  <Input
                    value={(data[occupationKey] as string) ?? ''}
                    onChange={(e) => update(occupationKey, e.target.value)}
                  />
                </div>
              </div>
            </div>
          )
        })}

      <h3 className="text-lg font-semibold">Emergency Contact</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Contact Name</Label>
          <Input
            value={data.emergencyContact ?? ''}
            onChange={(e) => update('emergencyContact', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Phone</Label>
          <Input
            value={data.emergencyPhone ?? ''}
            onChange={(e) => update('emergencyPhone', e.target.value)}
          />
        </div>
      </div>

      <h3 className="text-lg font-semibold">Previous School</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>School Name</Label>
          <Input
            value={data.previousSchool ?? ''}
            onChange={(e) => update('previousSchool', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Transfer Certificate No.</Label>
          <Input
            value={data.transferCertificateNumber ?? ''}
            onChange={(e) =>
              update('transferCertificateNumber', e.target.value)
            }
          />
        </div>
      </div>

      <h3 className="text-lg font-semibold">Transport</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Transport Mode</Label>
          <Select
            value={data.transportMode ?? ''}
            onValueChange={(val) =>
              update('transportMode', (val as string) || null)
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="school_bus">School Bus</SelectItem>
              <SelectItem value="van">Van</SelectItem>
              <SelectItem value="self">Self / Parent Drop</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Route</Label>
          <Input
            value={data.transportRoute ?? ''}
            onChange={(e) => update('transportRoute', e.target.value)}
            placeholder="e.g. Route 3 - Whitefield"
          />
        </div>
        <div className="space-y-2">
          <Label>Pickup Person</Label>
          <Input
            value={data.transportPickupPerson ?? ''}
            onChange={(e) => update('transportPickupPerson', e.target.value)}
            placeholder="Name of person picking up"
          />
        </div>
        <div className="space-y-2">
          <Label>Pickup Person Phone</Label>
          <Input
            value={data.transportPickupPhone ?? ''}
            onChange={(e) => update('transportPickupPhone', e.target.value)}
            placeholder="Phone number"
          />
        </div>
        <div className="space-y-2">
          <Label>Drop Person</Label>
          <Input
            value={data.transportDropPerson ?? ''}
            onChange={(e) => update('transportDropPerson', e.target.value)}
            placeholder="Name of person dropping off"
          />
        </div>
        <div className="space-y-2">
          <Label>Drop Person Phone</Label>
          <Input
            value={data.transportDropPhone ?? ''}
            onChange={(e) => update('transportDropPhone', e.target.value)}
            placeholder="Phone number"
          />
        </div>
      </div>

      <h3 className="text-lg font-semibold">Medical</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Medical Notes</Label>
          <Input
            value={data.medicalNotes ?? ''}
            onChange={(e) => update('medicalNotes', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Allergies</Label>
          <Input
            value={data.allergies ?? ''}
            onChange={(e) => update('allergies', e.target.value)}
          />
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Saving...' : 'Save Student'}
        </Button>
      </div>
    </form>
  )
}
