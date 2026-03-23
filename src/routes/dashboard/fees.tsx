import { createFileRoute } from '@tanstack/react-router'
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
import { listFees, deleteFeeRecord } from '#/server/fees'
import { downloadCsv } from '#/lib/csv'
import { getChildrenByParent } from '#/server/students'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs'

export const Route = createFileRoute('/dashboard/fees')({
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
  description: string | null
  notes: string | null
  studentName: string | null
  admissionNumber: string | null
}

function FeesPage() {
  const { session } = Route.useRouteContext()
  const userRole = (session.user as { role?: string }).role ?? 'student'
  const isStaffOrAdmin = userRole === 'admin' || userRole === 'staff'
  const queryClient = useQueryClient()

  const [selectedFee, setSelectedFee] = useState<FeeRecord | null>(null)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [editFee, setEditFee] = useState<FeeRecord | null>(null)
  const [editOpen, setEditOpen] = useState(false)

  const { data: fees = [] } = useQuery({
    queryKey: ['fees'],
    queryFn: () => listFees({ data: {} }) as Promise<FeeRecord[]>,
    enabled: isStaffOrAdmin,
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Fees</h1>
        {isStaffOrAdmin && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() =>
                downloadCsv(
                  fees,
                  [
                    { key: 'studentName', label: 'Student' },
                    { key: 'admissionNumber', label: 'Admission #' },
                    { key: 'description', label: 'Description' },
                    { key: 'amount', label: 'Amount' },
                    { key: 'paidAmount', label: 'Paid' },
                    { key: 'dueDate', label: 'Due Date' },
                    { key: 'paidDate', label: 'Paid Date' },
                    { key: 'status', label: 'Status' },
                    { key: 'paymentMethod', label: 'Payment Method' },
                    { key: 'receiptNumber', label: 'Receipt #' },
                  ],
                  'fees-export',
                )
              }
              disabled={fees.length === 0}
            >
              Export CSV
            </Button>
            <BulkFeeDialog onCreated={invalidateFees} />
            <CreateFeeDialog onCreated={invalidateFees} />
          </div>
        )}
      </div>

      {isStaffOrAdmin ? (
        <>
          <FeeTable
            fees={fees}
            onRecordPayment={handleRecordPayment}
            onEditFee={handleEditFee}
            onDeleteFee={handleDeleteFee}
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
  const { data: children = [], isLoading } = useQuery({
    queryKey: ['children'],
    queryFn: () => getChildrenByParent(),
  })

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading...</p>
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

  // Fallback: no children linked, show own fees
  return <FeeStudentView userId={userId} />
}
