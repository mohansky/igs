import { createFileRoute, redirect } from '@tanstack/react-router'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { formatDate } from '#/lib/utils'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import { Button } from '#/components/ui/button'
import { Badge } from '#/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs'
import { FeeTable } from '#/components/dashboard/FeeTable'
import { RecordPaymentDialog } from '#/components/dashboard/RecordPaymentDialog'
import { EditFeeDialog } from '#/components/dashboard/EditFeeDialog'
import { deleteFeeRecord } from '#/server/fees'
import {
  StudentProfileForm,
  type ProfileData,
} from '#/components/dashboard/StudentProfileForm'
import { Input } from '#/components/ui/input'
import { Separator } from '#/components/ui/separator'
import {
  getStudentProfile,
  updateStudentProfile,
  getStudentParents,
  addParentToStudent,
  removeParentFromStudent,
} from '#/server/students'
import { getStudentFees } from '#/server/fees'
import { listClasses } from '#/server/classes'
import { listParentUsers } from '#/server/users'
import { Image } from '#/components/ui/image'

export const Route = createFileRoute('/dashboard/students/$studentId')({
  beforeLoad: ({ context }) => {
    const userRole =
      (context.session.user as { role?: string }).role ?? 'student'
    if (userRole !== 'admin' && userRole !== 'staff') {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: StudentDetailPage,
})

interface FeeRecordRaw {
  id: number
  studentUserId: string
  amount: number
  dueDate: string
  paidDate: string | null
  paidAmount: number | null
  status: string
  paymentMethod: string | null
  receiptNumber: string | null
  description: string | null
  notes: string | null
}

interface FeeRecord extends FeeRecordRaw {
  studentProfileId: number | null
  studentName: string | null
  admissionNumber: string | null
}

interface StudentProfile {
  id: number
  studentName: string
  userId: string | null
  classId: number | null
  admissionNumber: string | null
  admissionDate: string | null
  dateOfBirth: string | null
  gender: string | null
  bloodGroup: string | null
  photoUrl: string | null
  parentName: string | null
  parentRelation: string | null
  parentPhone: string | null
  parentEmail: string | null
  parentOccupation: string | null
  emergencyContact: string | null
  emergencyPhone: string | null
  address: string | null
  nationality: string | null
  religion: string | null
  caste: string | null
  aadhaarNumber: string | null
  previousSchool: string | null
  transferCertificateNumber: string | null
  transportMode: string | null
  transportRoute: string | null
  transportPickupPerson: string | null
  transportPickupPhone: string | null
  transportDropPerson: string | null
  transportDropPhone: string | null
  medicalConditions: string | null
  medicalNotes: string | null
  allergies: string | null
  className?: string | null
  [key: string]: unknown
}

interface ParentLink {
  id: number
  parentUserId: string
  relation: string | null
  parentName: string
  parentEmail: string
}

function StudentDetailPage() {
  const { studentId } = Route.useParams()
  const queryClient = useQueryClient()
  const [selectedFee, setSelectedFee] = useState<FeeRecord | null>(null)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [editFee, setEditFee] = useState<FeeRecord | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [editing, setEditing] = useState(false)

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['students', Number(studentId)],
    queryFn: () =>
      getStudentProfile({
        data: { studentId: Number(studentId) },
      }) as Promise<StudentProfile | null>,
  })

  const { data: fees = [] } = useQuery({
    queryKey: ['fees', 'student', profile?.userId],
    queryFn: async () => {
      const raw = (await getStudentFees({
        data: { studentUserId: profile!.userId as string },
      })) as FeeRecordRaw[]
      return raw.map((f) => ({
        ...f,
        studentProfileId: Number(studentId),
        studentName: profile!.studentName,
        admissionNumber: profile!.admissionNumber ?? null,
      })) as FeeRecord[]
    },
    enabled: !!profile?.userId,
  })

  const { data: classes = [], isLoading: classesLoading } = useQuery({
    queryKey: ['classes'],
    queryFn: () =>
      listClasses().then((data) =>
        data.map((c) => ({
          id: c.id,
          name: c.name,
          section: c.section as string | null,
        })),
      ),
    enabled: editing,
  })

  const { data: parentUsers = [] } = useQuery({
    queryKey: ['parentUsers'],
    queryFn: () => listParentUsers(),
  })

  const { data: linkedParents = [] } = useQuery({
    queryKey: ['studentParents', Number(studentId)],
    queryFn: () =>
      getStudentParents({
        data: { studentProfileId: Number(studentId) },
      }) as Promise<ParentLink[]>,
  })

  const [addingParent, setAddingParent] = useState(false)
  const [parentSearch, setParentSearch] = useState('')
  const [newRelation, setNewRelation] = useState('')

  // Filter out already-linked parents from search results
  const linkedParentIds = new Set(linkedParents.map((p) => p.parentUserId))
  const filteredParents = parentSearch.trim()
    ? parentUsers.filter(
        (u) =>
          !linkedParentIds.has(u.id) &&
          (u.name.toLowerCase().includes(parentSearch.toLowerCase()) ||
            u.email.toLowerCase().includes(parentSearch.toLowerCase())),
      )
    : []

  const addParentMutation = useMutation({
    mutationFn: (vars: {
      parentUserId: string
      relation?: string | null
    }) =>
      addParentToStudent({
        data: {
          studentProfileId: Number(studentId),
          parentUserId: vars.parentUserId,
          relation: vars.relation,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['studentParents', Number(studentId)],
      })
      toast.success('Parent linked')
      setAddingParent(false)
      setParentSearch('')
      setNewRelation('')
    },
    onError: () => toast.error('Failed to link parent'),
  })

  const removeParentMutation = useMutation({
    mutationFn: (linkId: number) =>
      removeParentFromStudent({ data: { linkId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['studentParents', Number(studentId)],
      })
      toast.success('Parent unlinked')
    },
    onError: () => toast.error('Failed to unlink parent'),
  })

  const updateMutation = useMutation({
    mutationFn: (data: ProfileData) =>
      updateStudentProfile({
        data: {
          studentId: Number(studentId),
          updates: data as unknown as Record<string, unknown>,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['students', Number(studentId)],
      })
      setEditing(false)
      toast.success('Student profile updated')
    },
    onError: () => toast.error('Failed to update profile'),
  })

  const invalidateFees = () =>
    queryClient.invalidateQueries({
      queryKey: ['fees', 'student', profile?.userId],
    })

  const deleteMutation = useMutation({
    mutationFn: (feeId: number) => deleteFeeRecord({ data: { feeId } }),
    onSuccess: () => {
      toast.success('Fee record deleted')
      invalidateFees()
    },
    onError: () => toast.error('Failed to delete fee record'),
  })

  if (profileLoading) {
    return <p className="text-muted-foreground">Loading...</p>
  }

  if (!profile) {
    return <p className="text-muted-foreground">Student not found.</p>
  }

  if (editing) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Edit Student</h1>
          <Button variant="outline" onClick={() => setEditing(false)}>
            Cancel
          </Button>
        </div>
        {classesLoading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : (
          <StudentProfileForm
            initialData={profile}
            classes={classes}
            onSubmit={(data) => updateMutation.mutate(data)}
            loading={updateMutation.isPending}
          />
        )}
      </div>
    )
  }

  const transportMode = profile.transportMode
  const hasTransport = transportMode && transportMode !== 'self'

  return (
    <div className="space-y-6">
      {/* Header with photo and name */}
      <div className="flex items-start gap-6">
        {profile.photoUrl ? (
          <Image
            src={profile.photoUrl}
            alt={profile.studentName}
            width={96}
            height={96}
            className="size-24 rounded-lg border object-cover"
          />
        ) : (
          <div className="flex size-24 items-center justify-center rounded-lg border bg-muted text-2xl font-bold text-muted-foreground">
            {profile.studentName
              .split(' ')
              .map((n) => n[0])
              .join('')
              .slice(0, 2)
              .toUpperCase()}
          </div>
        )}
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{profile.studentName}</h1>
            {profile.admissionNumber && (
              <Badge variant="outline">#{profile.admissionNumber}</Badge>
            )}
          </div>
          {profile.gender && (
            <p className="mt-1 text-sm capitalize text-muted-foreground">
              {profile.gender}
              {profile.dateOfBirth ? ` · Born ${formatDate(profile.dateOfBirth)}` : ''}
              {profile.bloodGroup ? ` · ${profile.bloodGroup}` : ''}
            </p>
          )}
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => setEditing(true)}
          >
            Edit Profile
          </Button>
        </div>
      </div>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          {profile.userId && <TabsTrigger value="fees">Fees</TabsTrigger>}
        </TabsList>

        <TabsContent value="profile">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Basic Info</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                <InfoRow label="Name" value={profile.studentName} />
                <InfoRow label="Admission #" value={profile.admissionNumber} />
                <InfoRow
                  label="Admission Date"
                  value={formatDate(profile.admissionDate)}
                />
                <InfoRow label="Date of Birth" value={formatDate(profile.dateOfBirth)} />
                <InfoRow label="Gender" value={profile.gender} />
                <InfoRow label="Blood Group" value={profile.bloodGroup} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Personal Details</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                <InfoRow label="Nationality" value={profile.nationality} />
                <InfoRow label="Religion" value={profile.religion} />
                <InfoRow label="Caste" value={profile.caste} />
                <InfoRow label="Aadhaar" value={profile.aadhaarNumber} />
                <InfoRow label="Address" value={profile.address} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Parent / Guardian</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                <InfoRow label="Parent Name" value={profile.parentName} />
                <InfoRow label="Relation" value={profile.parentRelation} />
                <InfoRow label="Phone" value={profile.parentPhone} />
                <InfoRow label="Email" value={profile.parentEmail} />
                <InfoRow label="Occupation" value={profile.parentOccupation} />

                <Separator className="my-1" />
                <p className="text-xs font-medium text-muted-foreground">
                  Linked User Accounts
                </p>

                {linkedParents.length > 0 && (
                  <div className="space-y-2">
                    {linkedParents.map((parent) => (
                      <div
                        key={parent.id}
                        className="flex items-center gap-2 rounded-md border px-3 py-2"
                      >
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            {parent.parentName}
                            {parent.relation && (
                              <span className="ml-1.5 text-xs text-muted-foreground">
                                ({parent.relation})
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {parent.parentEmail}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="xs"
                          className="text-destructive"
                          onClick={() =>
                            removeParentMutation.mutate(parent.id)
                          }
                          disabled={removeParentMutation.isPending}
                        >
                          Unlink
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {addingParent ? (
                  <div className="space-y-2">
                    <div className="relative">
                      <Input
                        value={parentSearch}
                        onChange={(e) => setParentSearch(e.target.value)}
                        placeholder="Search user by name or email..."
                        autoFocus
                      />
                      {filteredParents.length > 0 && (
                        <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-md border bg-popover p-1 shadow-md">
                          {filteredParents.map((u) => (
                            <li key={u.id}>
                              <button
                                type="button"
                                className="w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                                onClick={() =>
                                  addParentMutation.mutate({
                                    parentUserId: u.id,
                                    relation: newRelation || null,
                                  })
                                }
                              >
                                <span className="font-medium">{u.name}</span>
                                <span className="ml-2 text-muted-foreground">
                                  {u.email}
                                </span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                      {parentSearch.trim() && filteredParents.length === 0 && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          No matching users found
                        </p>
                      )}
                    </div>
                    <Input
                      value={newRelation}
                      onChange={(e) => setNewRelation(e.target.value)}
                      placeholder="Relation (e.g. Mother, Father, Guardian)"
                    />
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => {
                        setAddingParent(false)
                        setParentSearch('')
                        setNewRelation('')
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAddingParent(true)}
                  >
                    Link Parent Account
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Emergency Contact</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                <InfoRow label="Contact" value={profile.emergencyContact} />
                <InfoRow label="Phone" value={profile.emergencyPhone} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Transport</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                <InfoRow
                  label="Mode"
                  value={
                    profile.transportMode === 'school_bus'
                      ? 'School Bus'
                      : profile.transportMode === 'van'
                        ? 'Van'
                        : profile.transportMode === 'self'
                          ? 'Self / Parent Drop'
                          : profile.transportMode
                  }
                />
                <InfoRow label="Route" value={profile.transportRoute} />
                {hasTransport && (
                  <>
                    <hr className="my-1 border-border" />
                    <p className="text-xs font-medium text-muted-foreground">
                      Pickup
                    </p>
                    <InfoRow
                      label="Person"
                      value={profile.transportPickupPerson}
                    />
                    <InfoRow
                      label="Phone"
                      value={profile.transportPickupPhone}
                    />
                    <hr className="my-1 border-border" />
                    <p className="text-xs font-medium text-muted-foreground">
                      Drop-off
                    </p>
                    <InfoRow
                      label="Person"
                      value={profile.transportDropPerson}
                    />
                    <InfoRow
                      label="Phone"
                      value={profile.transportDropPhone}
                    />
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Previous School</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                <InfoRow label="School" value={profile.previousSchool} />
                <InfoRow
                  label="TC Number"
                  value={profile.transferCertificateNumber}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Medical</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                <InfoRow label="Medical Notes" value={profile.medicalNotes} />
                <InfoRow label="Allergies" value={profile.allergies} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {profile.userId && (
          <TabsContent value="fees">
            <FeeTable
              fees={fees}
              onRecordPayment={(fee) => {
                setSelectedFee(fee)
                setPaymentOpen(true)
              }}
              onEditFee={(fee) => {
                setEditFee(fee)
                setEditOpen(true)
              }}
              onDeleteFee={(fee) => deleteMutation.mutate(fee.id)}
            />
            <RecordPaymentDialog
              fee={selectedFee}
              open={paymentOpen}
              onOpenChange={setPaymentOpen}
              onPaid={invalidateFees}
            />
            <EditFeeDialog
              fee={editFee}
              open={editOpen}
              onOpenChange={setEditOpen}
              onUpdated={invalidateFees}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value ?? '-'}</p>
    </div>
  )
}
