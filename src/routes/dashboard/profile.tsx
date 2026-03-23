import { createFileRoute } from '@tanstack/react-router'
import { useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { authClient } from '#/lib/auth-client'
import { uploadToR2 } from '#/server/upload'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Badge } from '#/components/ui/badge'
import { Image } from '#/components/ui/image'
import { Separator } from '#/components/ui/separator'
import {
  StudentProfileForm,
  type ProfileData,
} from '#/components/dashboard/StudentProfileForm'
import {
  getStudentProfile,
  createStudentProfile,
  updateStudentProfile,
  getChildrenByParent,
} from '#/server/students'
import { listClasses } from '#/server/classes'

export const Route = createFileRoute('/dashboard/profile')({
  component: ProfilePage,
})

function ProfilePage() {
  const { session } = Route.useRouteContext()
  const userRole = (session.user as { role?: string }).role ?? 'student'

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Profile</h1>
        <p className="text-muted-foreground">
          Manage your account and profile settings
        </p>
      </div>

      <AccountSection session={session} userRole={userRole} />

      <Separator />

      <PasswordSection />

      {userRole === 'student' && (
        <>
          <Separator />
          <ChildrenSection session={session} />
        </>
      )}

      {(userRole === 'student' || userRole === 'staff') && (
        <>
          <Separator />
          <StudentProfileSection session={session} userRole={userRole} />
        </>
      )}
    </div>
  )
}

// ── Account section (avatar, name, email) ──────────────────

function AccountSection({
  session,
  userRole,
}: {
  session: { user: { id: string; name: string; email: string; image?: string | null } }
  userRole: string
}) {
  const queryClient = useQueryClient()
  const [name, setName] = useState(session.user.name)
  const [imageUrl, setImageUrl] = useState(session.user.image ?? '')
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const updateMutation = useMutation({
    mutationFn: async () => {
      await authClient.updateUser({
        name,
        image: imageUrl || undefined,
      })
    },
    onSuccess: () => {
      toast.success('Profile updated')
      // Refresh session data
      window.location.reload()
    },
    onError: () => toast.error('Failed to update profile'),
  })

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
          folder: 'avatars',
        },
      })
      setImageUrl(result.url)
      toast.success('Photo uploaded')
    } catch {
      toast.error('Photo upload failed')
    } finally {
      setUploading(false)
    }
  }

  const hasChanges =
    name !== session.user.name || imageUrl !== (session.user.image ?? '')

  return (
    <Card>
      <CardHeader>
        <CardTitle>Account</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Avatar */}
        <div className="flex items-center gap-4">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={name}
              width={80}
              height={80}
              className="size-20 rounded-full border object-cover"
            />
          ) : (
            <div className="flex size-20 items-center justify-center rounded-full border bg-muted text-xl font-bold text-muted-foreground">
              {name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()}
            </div>
          )}
          <div className="space-y-2">
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
                : imageUrl
                  ? 'Change photo'
                  : 'Upload photo'}
            </Button>
            {imageUrl && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="ml-2 text-destructive"
                onClick={() => setImageUrl('')}
              >
                Remove
              </Button>
            )}
          </div>
        </div>

        {/* Name + Email */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              value={session.user.email}
              disabled
              className="text-muted-foreground"
            />
            <p className="text-xs text-muted-foreground">
              Email cannot be changed
            </p>
          </div>
        </div>

        {/* Role badge */}
        <div className="space-y-2">
          <Label>Role</Label>
          <div>
            <Badge variant="outline" className="capitalize">
              {userRole}
            </Badge>
          </div>
        </div>

        <Button
          onClick={() => updateMutation.mutate()}
          disabled={updateMutation.isPending || !hasChanges || !name.trim()}
        >
          {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </CardContent>
    </Card>
  )
}

// ── Password section ───────────────────────────────────────

function PasswordSection() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const changeMutation = useMutation({
    mutationFn: async () => {
      const result = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: false,
      })
      if (result.error) {
        throw new Error(result.error.message ?? 'Failed to change password')
      }
    },
    onSuccess: () => {
      toast.success('Password changed')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : 'Failed to change password'),
  })

  const canSubmit =
    currentPassword.trim() &&
    newPassword.trim() &&
    newPassword === confirmPassword &&
    newPassword.length >= 8

  return (
    <Card>
      <CardHeader>
        <CardTitle>Change Password</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Current Password</Label>
            <Input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Min 8 characters"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
        </div>
        {newPassword && confirmPassword && newPassword !== confirmPassword && (
          <p className="text-sm text-destructive">Passwords do not match</p>
        )}
        <Button
          onClick={() => changeMutation.mutate()}
          disabled={changeMutation.isPending || !canSubmit}
        >
          {changeMutation.isPending ? 'Changing...' : 'Change Password'}
        </Button>
      </CardContent>
    </Card>
  )
}

// ── Children section (for parents) ─────────────────────────

function ChildrenSection({
  session,
}: {
  session: { user: { id: string } }
}) {
  const { data: children = [], isLoading } = useQuery({
    queryKey: ['children'],
    queryFn: () => getChildrenByParent(),
  })

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading...</p>
  }

  if (children.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Linked Children</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {children.map((child) => (
            <div
              key={child.id}
              className="flex items-center gap-3 rounded-md border p-3"
            >
              <div className="flex size-10 items-center justify-center rounded-full bg-muted text-sm font-bold text-muted-foreground">
                {child.studentName
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-medium">
                  {child.studentName}
                  {child.relation && (
                    <span className="ml-1 text-xs text-muted-foreground">
                      ({child.relation})
                    </span>
                  )}
                </p>
                {child.admissionNumber && (
                  <p className="text-xs text-muted-foreground">
                    #{child.admissionNumber}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ── Student profile section ────────────────────────────────

function StudentProfileSection({
  session,
  userRole,
}: {
  session: { user: { id: string; name: string } }
  userRole: string
}) {
  const queryClient = useQueryClient()

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['students', 'byUser', session.user.id],
    queryFn: () =>
      getStudentProfile({ data: { userId: session.user.id } }) as Promise<
        (ProfileData & { id?: number }) | null
      >,
  })

  const { data: classes = [], isLoading: classesLoading } = useQuery({
    queryKey: ['classes'],
    queryFn: () =>
      listClasses().then((c) =>
        c.map((cls: { id: number; name: string; section: string | null }) => ({
          id: cls.id,
          name: cls.name,
          section: cls.section,
        })),
      ),
  })

  const saveMutation = useMutation({
    mutationFn: async (data: ProfileData) => {
      if (profile?.id) {
        await updateStudentProfile({
          data: {
            studentId: profile.id,
            updates: data as unknown as Record<string, unknown>,
          },
        })
      } else {
        await createStudentProfile({
          data: {
            ...data,
            studentName: data.studentName || session.user.name,
            userId: session.user.id,
          },
        })
      }
    },
    onSuccess: () => {
      toast.success('Student profile saved')
      queryClient.invalidateQueries({
        queryKey: ['students', 'byUser', session.user.id],
      })
    },
    onError: () => toast.error('Failed to save profile'),
  })

  if (profileLoading || classesLoading) {
    return <p className="text-muted-foreground">Loading...</p>
  }

  // Only show student profile form for students, or staff if they already have one
  if (userRole !== 'student' && !profile) return null

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Student Profile</h2>
        <p className="text-sm text-muted-foreground">
          Additional details for your student record
        </p>
      </div>
      <StudentProfileForm
        initialData={
          profile
            ? { ...profile }
            : { studentName: session.user.name, userId: session.user.id }
        }
        classes={classes}
        onSubmit={(data) => saveMutation.mutate(data)}
        loading={saveMutation.isPending}
      />
    </div>
  )
}
