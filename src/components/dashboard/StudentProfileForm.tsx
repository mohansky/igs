import { useRef, useState } from 'react'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Image } from '#/components/ui/image'
import { uploadToR2 } from '#/server/upload'

export interface ProfileData {
  studentName: string
  userId?: string | null
  classId?: number | null
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
  emergencyContact?: string | null
  emergencyPhone?: string | null
  address?: string | null
  nationality?: string | null
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
}

const selectClass =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'

export function StudentProfileForm({
  initialData,
  classes,
  onSubmit,
  loading,
}: {
  initialData?: Partial<ProfileData> | null
  classes: ClassItem[]
  onSubmit: (data: ProfileData) => void
  loading: boolean
}) {
  const [data, setData] = useState<ProfileData>({
    studentName: '',
    ...initialData,
  })
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const update = (field: keyof ProfileData, value: string | number | null) => {
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
    <form onSubmit={handleSubmit} className="space-y-6">
      <h3 className="text-lg font-semibold">Basic Information</h3>
      <div className="grid gap-4 sm:grid-cols-2">
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
          <Label>Class</Label>
          <select
            value={data.classId ?? ''}
            onChange={(e) =>
              update('classId', e.target.value ? Number(e.target.value) : null)
            }
            className={selectClass}
          >
            <option value="">Select class</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.section ? ` - ${c.section}` : ''}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label>Admission Number</Label>
          <Input
            value={data.admissionNumber ?? ''}
            onChange={(e) => update('admissionNumber', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Date of Birth</Label>
          <Input
            type="date"
            value={data.dateOfBirth ?? ''}
            onChange={(e) => update('dateOfBirth', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Gender</Label>
          <select
            value={data.gender ?? ''}
            onChange={(e) => update('gender', e.target.value)}
            className={selectClass}
          >
            <option value="">Select</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label>Blood Group</Label>
          <Input
            value={data.bloodGroup ?? ''}
            onChange={(e) => update('bloodGroup', e.target.value)}
            placeholder="e.g. A+, B-, O+"
          />
        </div>
        <div className="space-y-2">
          <Label>Admission Date</Label>
          <Input
            type="date"
            value={data.admissionDate ?? ''}
            onChange={(e) => update('admissionDate', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Photo</Label>
          <div className="flex items-center gap-4">
            {data.photoUrl && (
              <Image
                src={data.photoUrl}
                alt="Student photo"
                width={64}
                height={64}
                className="size-16 rounded-lg object-cover"
              />
            )}
            <div className="flex-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handlePhotoUpload}
                className="hidden"
              />
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
                    ? 'Change photo'
                    : 'Upload photo'}
              </Button>
              {data.photoUrl && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="ml-2 text-destructive"
                  onClick={() => update('photoUrl', null)}
                >
                  Remove
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <h3 className="text-lg font-semibold">Personal Details</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Nationality</Label>
          <Input
            value={data.nationality ?? ''}
            onChange={(e) => update('nationality', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Religion</Label>
          <Input
            value={data.religion ?? ''}
            onChange={(e) => update('religion', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Caste</Label>
          <Input
            value={data.caste ?? ''}
            onChange={(e) => update('caste', e.target.value)}
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
        <div className="space-y-2 sm:col-span-2">
          <Label>Address</Label>
          <Input
            value={data.address ?? ''}
            onChange={(e) => update('address', e.target.value)}
          />
        </div>
      </div>

      <h3 className="text-lg font-semibold">Parent / Guardian</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Parent Name</Label>
          <Input
            value={data.parentName ?? ''}
            onChange={(e) => update('parentName', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Relation</Label>
          <Input
            value={data.parentRelation ?? ''}
            onChange={(e) => update('parentRelation', e.target.value)}
            placeholder="e.g. Father, Mother, Guardian"
          />
        </div>
        <div className="space-y-2">
          <Label>Phone</Label>
          <Input
            value={data.parentPhone ?? ''}
            onChange={(e) => update('parentPhone', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Email</Label>
          <Input
            type="email"
            value={data.parentEmail ?? ''}
            onChange={(e) => update('parentEmail', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Occupation</Label>
          <Input
            value={data.parentOccupation ?? ''}
            onChange={(e) => update('parentOccupation', e.target.value)}
          />
        </div>
      </div>

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
            onChange={(e) => update('transferCertificateNumber', e.target.value)}
          />
        </div>
      </div>

      <h3 className="text-lg font-semibold">Transport</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Transport Mode</Label>
          <select
            value={data.transportMode ?? ''}
            onChange={(e) => update('transportMode', e.target.value)}
            className={selectClass}
          >
            <option value="">Select</option>
            <option value="school_bus">School Bus</option>
            <option value="van">Van</option>
            <option value="self">Self / Parent Drop</option>
            <option value="other">Other</option>
          </select>
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

      <Button type="submit" disabled={loading}>
        {loading ? 'Saving...' : 'Save'}
      </Button>
    </form>
  )
}
