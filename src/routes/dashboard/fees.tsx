import { createFileRoute, redirect } from '@tanstack/react-router'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { FeeTable } from '#/components/dashboard/FeeTable'
import { FeeStudentView } from '#/components/dashboard/FeeStudentView'
import { CreateFeeDialog } from '#/components/dashboard/CreateFeeDialog'
import { RecordPaymentDialog } from '#/components/dashboard/RecordPaymentDialog'
import { EditFeeDialog } from '#/components/dashboard/EditFeeDialog'
import { BulkFeeDialog } from '#/components/dashboard/BulkFeeDialog'
import { Button } from '#/components/ui/button'
import { Skeleton } from '#/components/ui/skeleton'
import { Card, CardContent } from '#/components/ui/card'
import {
  listFees,
  deleteFeeRecord,
  bulkMarkFeesPaid,
  bulkDeleteFees,
} from '#/server/fees'
import { downloadCsv } from '#/lib/csv'
import { getChildrenByParent, getStudentProfile } from '#/server/students'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs'
import DownloadIcon from '#/components/icons/DownloadIcon'

export const Route = createFileRoute('/dashboard/fees')({
  beforeLoad: ({ context }) => {
    // Fees is admin-managed; students/parents see their own fees below.
    // Staff have no fee access.
    const userRole =
      (context.session.user as { role?: string }).role ?? 'student'
    if (userRole === 'staff') {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: FeesPage,
})

export interface FeeRecord {
  id: number
  studentUserId: string
  studentProfileId: number | null
  amount: number
  dueDate: string
  paidDate: string | null
  paidAmount: number | null
  status: string
  paymentMethod: string | null
  receiptNumber: string | null
  razorpayOrderId: string | null
  razorpayPaymentId: string | null
  description: string | null
  notes: string | null
  studentName: string | null
  admissionNumber: string | null
  classId: number | null
  className: string | null
  classSection: string | null
  isOverdue: boolean
  receivedByUserId: string | null
  receivedByName: string | null
}

function FeesPage() {
  const { session } = Route.useRouteContext()
  const userRole = (session.user as { role?: string }).role ?? 'student'
  const isAdmin = userRole === 'admin'
  const queryClient = useQueryClient()

  const [selectedFee, setSelectedFee] = useState<FeeRecord | null>(null)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [editFee, setEditFee] = useState<FeeRecord | null>(null)
  const [editOpen, setEditOpen] = useState(false)

  const { data: fees = [], isLoading: feesLoading } = useQuery({
    queryKey: ['fees'],
    queryFn: () => listFees({ data: {} }) as Promise<FeeRecord[]>,
    enabled: isAdmin,
  })

  const invalidateFees = () =>
    queryClient.invalidateQueries({ queryKey: ['fees'] })

  const handleRecordPayment = (fee: FeeRecord) => {
    setSelectedFee(fee)
    setPaymentOpen(true)
  }

  const handleEditFee = (fee: FeeRecord) => {
    setEditFee(fee)
    setEditOpen(true)
  }

  const deleteMutation = useMutation({
    mutationFn: (feeId: number) => deleteFeeRecord({ data: { feeId } }),
    onSuccess: () => {
      toast.success('Fee record deleted')
      invalidateFees()
    },
    onError: () => toast.error('Failed to delete fee record'),
  })

  const handleDeleteFee = (fee: FeeRecord) => {
    deleteMutation.mutate(fee.id)
  }

  const bulkPayMutation = useMutation({
    mutationFn: (vars: {
      feeIds: number[]
      paymentMethod: string
      paidDate: string
    }) => bulkMarkFeesPaid({ data: vars }),
    onSuccess: (res) => {
      toast.success(`Marked ${res.updated} fee(s) as paid`)
      invalidateFees()
    },
    onError: () => toast.error('Failed to mark fees as paid'),
  })

  const bulkDeleteMutation = useMutation({
    mutationFn: (feeIds: number[]) => bulkDeleteFees({ data: { feeIds } }),
    onSuccess: (res) => {
      toast.success(`Deleted ${res.deleted} fee record(s)`)
      invalidateFees()
    },
    onError: () => toast.error('Failed to delete fee records'),
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">Fees</h1>
        {isAdmin && (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() =>
                downloadCsv(
                  fees,
                  [
                    { key: 'studentName', label: 'Student' },
                    { key: 'admissionNumber', label: 'Admission #' },
                    { key: 'className', label: 'Class' },
                    { key: 'classSection', label: 'Section' },
                    { key: 'description', label: 'Description' },
                    { key: 'amount', label: 'Amount' },
                    { key: 'paidAmount', label: 'Paid' },
                    { key: 'dueDate', label: 'Due Date' },
                    { key: 'paidDate', label: 'Paid Date' },
                    { key: 'status', label: 'Status' },
                    { key: 'paymentMethod', label: 'Payment Method' },
                    { key: 'receiptNumber', label: 'Receipt #' },
                    { key: 'razorpayOrderId', label: 'Razorpay Order ID' },
                    { key: 'razorpayPaymentId', label: 'Razorpay Payment ID' },
                    { key: 'receivedByName', label: 'Received By' },
                  ],
                  'fees-export',
                )
              }
              disabled={fees.length === 0}
            >
              <DownloadIcon className="h-4 w-4" />
              Export CSV
            </Button>
            <BulkFeeDialog onCreated={invalidateFees} />
            <CreateFeeDialog onCreated={invalidateFees} />
          </div>
        )}
      </div>

      {isAdmin && feesLoading && <FeeTableSkeleton />}

      {isAdmin && !feesLoading ? (
        <>
          <FeeTable
            fees={fees}
            onRecordPayment={handleRecordPayment}
            onEditFee={handleEditFee}
            onDeleteFee={handleDeleteFee}
            onBulkPay={(ids, paymentMethod, paidDate) =>
              bulkPayMutation.mutate({ feeIds: ids, paymentMethod, paidDate })
            }
            onBulkDelete={(ids) => bulkDeleteMutation.mutate(ids)}
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
        </>
      ) : (
        <ParentFeeView userId={session.user.id} />
      )}
    </div>
  )
}

function ParentFeeView({ userId }: { userId: string }) {
  const { data: children = [], isLoading: childrenLoading } = useQuery({
    queryKey: ['children'],
    queryFn: () => getChildrenByParent(),
  })

  // Fallback: look up own student profile if no children linked
  const { data: ownProfile, isLoading: profileLoading } = useQuery({
    queryKey: ['students', 'byUser', userId],
    queryFn: () =>
      getStudentProfile({ data: { userId } }) as Promise<{
        id: number
      } | null>,
    enabled: !childrenLoading && children.length === 0,
  })

  if (childrenLoading || profileLoading) {
    return <FeeTableSkeleton />
  }

  // If parent has linked children, show tabs per child
  if (children.length > 0) {
    return (
      <Tabs defaultValue={String(children[0].id)}>
        <TabsList>
          {children.map((child) => (
            <TabsTrigger key={child.id} value={String(child.id)}>
              {child.studentName}
            </TabsTrigger>
          ))}
        </TabsList>
        {children.map((child) => (
          <TabsContent key={child.id} value={String(child.id)}>
            <FeeStudentView studentProfileId={child.id} />
          </TabsContent>
        ))}
      </Tabs>
    )
  }

  // Fallback: show own fees by profile ID
  if (ownProfile) {
    return <FeeStudentView studentProfileId={ownProfile.id} />
  }

  return <p className="text-sm text-muted-foreground">No fee records found.</p>
}

function FeeTableSkeleton() {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="flex gap-2 border-b p-4">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="divide-y">
          {Array.from({ length: 6 }).map((_, r) => (
            <div key={r} className="flex items-center gap-4 px-4 py-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
