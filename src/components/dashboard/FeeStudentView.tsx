import type { ColumnDef } from '@tanstack/react-table'
import { Badge } from '#/components/ui/badge'
import { useQuery } from '@tanstack/react-query'
import { formatDate, formatCurrency } from '#/lib/utils'
import { getStudentFees } from '#/server/fees'
import { CustomDataTable } from './CustomDataTable'

// ⚠️ Razorpay online payments are currently DISABLED (potential future addition).
// To re-enable, restore the imports below, the verify mutation + handlePay flow,
// and the "Pay Online" column, plus src/server/razorpay.ts and src/lib/razorpay.ts.
// import { useState } from 'react'
// import { Button } from '#/components/ui/button'
// import { useMutation, useQueryClient } from '@tanstack/react-query'
// import { toast } from 'sonner'
// import {
//   createRazorpayOrderForFee,
//   verifyRazorpayPayment,
// } from '#/server/razorpay'
// import { loadRazorpayCheckout } from '#/lib/razorpay'

interface FeeRecord {
  id: number
  amount: number
  dueDate: string
  paidDate: string | null
  paidAmount: number | null
  status: string
  description: string | null
  isOverdue: boolean
}

const statusBadgeVariant = (status: string) => {
  switch (status) {
    case 'paid':
      return 'default' as const
    case 'pending':
      return 'secondary' as const
    case 'partial':
      return 'outline' as const
    case 'overdue':
      return 'destructive' as const
    default:
      return 'outline' as const
  }
}

export function FeeStudentView({
  studentProfileId,
}: {
  studentProfileId: number
}) {
  const { data: fees = [], isLoading } = useQuery({
    queryKey: ['fees', 'student', studentProfileId],
    queryFn: () =>
      getStudentFees({
        data: { studentProfileId },
      }) as Promise<FeeRecord[]>,
  })

  // ⚠️ Razorpay online payment flow — disabled. Restore alongside the imports
  // above and the "Pay Online" column to re-enable.
  /*
  const queryClient = useQueryClient()
  const [payingFeeId, setPayingFeeId] = useState<number | null>(null)

  const verifyMutation = useMutation({
    mutationFn: (vars: {
      feeId: number
      orderId: string
      paymentId: string
      signature: string
    }) => verifyRazorpayPayment({ data: vars }),
    onSuccess: (res) => {
      if (res.alreadyPaid) {
        toast.info('Fee was already marked paid')
      } else {
        toast.success('Payment received')
      }
      queryClient.invalidateQueries({
        queryKey: ['fees', 'student', studentProfileId],
      })
      queryClient.invalidateQueries({ queryKey: ['fees'] })
      queryClient.invalidateQueries({ queryKey: ['monthly-overview'] })
    },
    onError: (err: Error) =>
      toast.error(err.message || 'Failed to verify payment'),
  })

  const handlePay = async (fee: FeeRecord) => {
    setPayingFeeId(fee.id)
    try {
      await loadRazorpayCheckout()
      const order = await createRazorpayOrderForFee({
        data: { feeId: fee.id },
      })

      const Razorpay = window.Razorpay
      if (!Razorpay) throw new Error('Razorpay checkout failed to load')

      const rzp = new Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: 'Indo German School',
        description: order.description ?? `Fee payment #${order.feeId}`,
        order_id: order.orderId,
        theme: { color: '#328f97' },
        modal: {
          ondismiss: () => setPayingFeeId(null),
        },
        handler: (response) => {
          verifyMutation.mutate({
            feeId: fee.id,
            orderId: response.razorpay_order_id,
            paymentId: response.razorpay_payment_id,
            signature: response.razorpay_signature,
          })
          setPayingFeeId(null)
        },
      })
      rzp.open()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Payment failed')
      setPayingFeeId(null)
    }
  }
  */

  const columns: ColumnDef<FeeRecord>[] = [
    {
      accessorKey: 'description',
      header: 'Description',
      cell: ({ row }) => (
        <span className="font-medium">
          {row.getValue('description') ?? '-'}
        </span>
      ),
    },
    {
      accessorKey: 'amount',
      header: 'Amount',
      cell: ({ row }) => formatCurrency(row.getValue('amount') as number),
    },
    {
      accessorKey: 'dueDate',
      header: 'Due Date',
      cell: ({ row }) => formatDate(row.getValue('dueDate')),
    },
    {
      accessorKey: 'paidAmount',
      header: 'Paid',
      cell: ({ row }) =>
        formatCurrency(row.getValue('paidAmount') as number | null),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const fee = row.original
        return (
          <div className="flex flex-wrap items-center gap-1">
            <Badge
              className="capitalize"
              variant={statusBadgeVariant(fee.status)}
            >
              {fee.status}
            </Badge>
            {fee.isOverdue && fee.status !== 'paid' && (
              <Badge variant="destructive">Overdue</Badge>
            )}
          </div>
        )
      },
    },
    // ⚠️ Razorpay "Pay Online" column — disabled (potential future addition).
    // {
    //   id: 'pay',
    //   header: 'Pay',
    //   enableSorting: false,
    //   cell: ({ row }) => {
    //     const fee = row.original
    //     if (fee.status === 'paid') return null
    //     const isPaying = payingFeeId === fee.id || verifyMutation.isPending
    //     return (
    //       <Button size="xs" onClick={() => handlePay(fee)} disabled={isPaying}>
    //         {isPaying ? 'Processing...' : 'Pay Online'}
    //       </Button>
    //     )
    //   },
    // },
  ]

  const totalDue = fees.reduce((sum, f) => sum + f.amount, 0)
  const totalPaid = fees.reduce((sum, f) => sum + (f.paidAmount ?? 0), 0)

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading...</p>
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Badge variant="outline">Total Due: {formatCurrency(totalDue)}</Badge>
        <Badge variant="default">Total Paid: {formatCurrency(totalPaid)}</Badge>
        <Badge variant={totalDue - totalPaid > 0 ? 'destructive' : 'default'}>
          Balance: {formatCurrency(totalDue - totalPaid)}
        </Badge>
      </div>

      <CustomDataTable
        columns={columns}
        data={fees}
        showDatePicker
        dateField="dueDate"
      />
    </div>
  )
}
