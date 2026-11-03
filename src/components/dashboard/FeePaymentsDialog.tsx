import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { FileAttachmentIcon } from 'hugeicons-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { ConfirmDialog } from '#/components/dashboard/ConfirmDialog'
import { formatCurrency, formatDate } from '#/lib/utils'
import { schoolToday } from '#/lib/fee-math'
import {
  deleteFeePayment,
  listFeePayments,
  updateFeePayment,
} from '#/server/fees'
import {
  deleteFeeAttachment,
  listFeeAttachments,
} from '#/server/feeAttachments'

const R2_BASE_URL = import.meta.env.VITE_R2_BASE_URL ?? ''

function resolveUrl(url: string): string {
  if (url.startsWith('http') || url.startsWith('data:')) return url
  const base = R2_BASE_URL.endsWith('/') ? R2_BASE_URL : `${R2_BASE_URL}/`
  const path = url.startsWith('/') ? url.slice(1) : url
  return `${base}${path}`
}

interface Payment {
  id: number
  feeId: number
  amount: number
  paidDate: string
  paymentMethod: string
  receiptNumber: string | null
  razorpayOrderId: string | null
  razorpayPaymentId: string | null
  notes: string | null
  receivedByUserId: string | null
  receivedByName: string | null
  createdAt: Date | null
}

interface Attachment {
  id: number
  feeId: number
  feePaymentId: number | null
  title: string
  description: string | null
  attachmentUrl: string
  attachmentType: string
  createdAt: Date | null
}

interface FeeSummary {
  id: number
  amount: number
  paidAmount: number | null
  description: string | null
  studentName: string | null
  isOpen?: boolean
}

export function FeePaymentsDialog({
  fee,
  open,
  onOpenChange,
}: {
  fee: FeeSummary | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()
  const feeId = fee?.id ?? 0

  const paymentsKey = ['fee-payments', feeId]
  const attachmentsKey = ['fee-attachments', feeId]

  const { data: payments = [] } = useQuery({
    queryKey: paymentsKey,
    queryFn: () => listFeePayments({ data: { feeId } }) as Promise<Payment[]>,
    enabled: open && feeId > 0,
  })

  const { data: attachments = [] } = useQuery({
    queryKey: attachmentsKey,
    queryFn: () =>
      listFeeAttachments({ data: { feeId } }) as Promise<Attachment[]>,
    enabled: open && feeId > 0,
  })

  const [paymentToDelete, setPaymentToDelete] = useState<number | null>(null)
  // Inline edit of one payment's amount / date received.
  const [editing, setEditing] = useState<{
    id: number
    amount: string
    paidDate: string
  } | null>(null)
  const [attachmentToDelete, setAttachmentToDelete] = useState<number | null>(
    null,
  )

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: paymentsKey })
    queryClient.invalidateQueries({ queryKey: attachmentsKey })
    queryClient.invalidateQueries({ queryKey: ['fees'] })
    queryClient.invalidateQueries({ queryKey: ['monthly-overview'] })
  }

  const deletePaymentMutation = useMutation({
    mutationFn: (paymentId: number) =>
      deleteFeePayment({ data: { paymentId } }),
    onSuccess: () => {
      toast.success('Payment removed')
      refresh()
    },
    onError: () => toast.error('Failed to remove payment'),
  })

  const updatePaymentMutation = useMutation({
    mutationFn: (e: { id: number; amount: string; paidDate: string }) =>
      updateFeePayment({
        data: {
          paymentId: e.id,
          amount: Number(e.amount),
          paidDate: e.paidDate,
        },
      }),
    onSuccess: () => {
      toast.success('Payment updated')
      setEditing(null)
      refresh()
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to update payment'),
  })

  const deleteAttachmentMutation = useMutation({
    mutationFn: (id: number) => deleteFeeAttachment({ data: { id } }),
    onSuccess: () => {
      toast.success('Receipt removed')
      refresh()
    },
    onError: () => toast.error('Failed to remove receipt'),
  })

  const orphanReceipts = attachments.filter((a) => a.feePaymentId == null)
  const total = fee ? fee.amount : 0
  const paid = fee?.paidAmount ?? 0
  const remaining = Math.max(total - paid, 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Payment history</DialogTitle>
          <DialogDescription>
            {fee?.studentName ?? 'Student'} · {fee?.description ?? 'Fee'}
          </DialogDescription>
        </DialogHeader>

        {fee?.isOpen ? (
          // Concession: no amount due, so no total/remaining.
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-md border bg-muted/30 p-2">
              <p className="text-xs text-muted-foreground">Total received</p>
              <p className="font-medium text-green-600">
                {formatCurrency(paid)}
              </p>
            </div>
            <div className="rounded-md border bg-muted/30 p-2">
              <p className="text-xs text-muted-foreground">Payments</p>
              <p className="font-medium">{payments.length}</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div className="rounded-md border bg-muted/30 p-2">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="font-medium">{formatCurrency(total)}</p>
            </div>
            <div className="rounded-md border bg-muted/30 p-2">
              <p className="text-xs text-muted-foreground">Paid</p>
              <p className="font-medium text-green-600">
                {formatCurrency(paid)}
              </p>
            </div>
            <div className="rounded-md border bg-muted/30 p-2">
              <p className="text-xs text-muted-foreground">Remaining</p>
              <p className="font-medium text-amber-600">
                {formatCurrency(remaining)}
              </p>
            </div>
          </div>
        )}

        <div className="max-h-[55vh] space-y-3 overflow-y-auto pr-1">
          {payments.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No payments recorded yet.
            </p>
          ) : (
            payments.map((p, i) => {
              const paymentReceipts = attachments.filter(
                (a) => a.feePaymentId === p.id,
              )
              return (
                <div key={p.id} className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">
                        Payment #{i + 1} · {formatCurrency(p.amount)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(p.paidDate)} ·{' '}
                        <span className="capitalize">
                          {p.paymentMethod.replace('_', ' ')}
                        </span>
                        {p.receiptNumber ? ` · #${p.receiptNumber}` : ''}
                      </p>
                      {p.receivedByName && (
                        <p className="text-xs text-muted-foreground">
                          {p.paymentMethod === 'razorpay'
                            ? 'Paid online by'
                            : 'Recorded by'}
                          : {p.receivedByName}
                        </p>
                      )}
                      {p.razorpayPaymentId && (
                        <p className="text-xs text-muted-foreground break-all">
                          Razorpay: {p.razorpayPaymentId}
                        </p>
                      )}
                      {p.notes && (
                        <p className="text-xs text-muted-foreground">
                          {p.notes}
                        </p>
                      )}
                      {/* When the entry was made, if not the day it was paid */}
                      {p.createdAt &&
                        schoolToday(new Date(p.createdAt)) !== p.paidDate && (
                          <p className="text-xs text-muted-foreground">
                            Entered{' '}
                            {formatDate(schoolToday(new Date(p.createdAt)))}
                          </p>
                        )}
                    </div>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        className="text-xs text-muted-foreground hover:text-primary"
                        onClick={() =>
                          setEditing({
                            id: p.id,
                            amount: String(p.amount),
                            paidDate: p.paidDate,
                          })
                        }
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="text-xs text-muted-foreground hover:text-destructive"
                        onClick={() => setPaymentToDelete(p.id)}
                        disabled={deletePaymentMutation.isPending}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  {editing?.id === p.id && (
                    <form
                      className="flex flex-wrap items-end gap-2 border-t pt-2"
                      onSubmit={(e) => {
                        e.preventDefault()
                        updatePaymentMutation.mutate(editing)
                      }}
                    >
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">
                          Amount
                        </label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={editing.amount}
                          onChange={(e) =>
                            setEditing({ ...editing, amount: e.target.value })
                          }
                          className="h-8 w-32"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">
                          Date received
                        </label>
                        <Input
                          type="date"
                          max={schoolToday()}
                          value={editing.paidDate}
                          onChange={(e) =>
                            setEditing({ ...editing, paidDate: e.target.value })
                          }
                          className="h-8 w-40"
                          required
                        />
                      </div>
                      <Button
                        type="submit"
                        size="sm"
                        disabled={updatePaymentMutation.isPending}
                      >
                        Save
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditing(null)}
                      >
                        Cancel
                      </Button>
                    </form>
                  )}
                  {paymentReceipts.length > 0 && (
                    <div className="space-y-1 border-t pt-2">
                      {paymentReceipts.map((att) => {
                        const href =
                          att.attachmentType === 'file'
                            ? resolveUrl(att.attachmentUrl)
                            : att.attachmentUrl
                        return (
                          <div
                            key={att.id}
                            className="flex items-center gap-2 text-xs"
                          >
                            <FileAttachmentIcon className="size-3.5 shrink-0 text-muted-foreground" />
                            <a
                              href={href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="truncate text-primary hover:underline"
                            >
                              {att.title}
                            </a>
                            <button
                              type="button"
                              className="ml-auto text-muted-foreground hover:text-destructive"
                              onClick={() => setAttachmentToDelete(att.id)}
                            >
                              Remove
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })
          )}

          {orphanReceipts.length > 0 && (
            <div className="rounded-lg border border-dashed p-3 space-y-1">
              <p className="text-xs font-medium text-muted-foreground">
                Receipts not linked to a specific payment
              </p>
              {orphanReceipts.map((att) => {
                const href =
                  att.attachmentType === 'file'
                    ? resolveUrl(att.attachmentUrl)
                    : att.attachmentUrl
                return (
                  <div key={att.id} className="flex items-center gap-2 text-xs">
                    <FileAttachmentIcon className="size-3.5 shrink-0 text-muted-foreground" />
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate text-primary hover:underline"
                    >
                      {att.title}
                    </a>
                    <button
                      type="button"
                      className="ml-auto text-muted-foreground hover:text-destructive"
                      onClick={() => setAttachmentToDelete(att.id)}
                    >
                      Remove
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>

      <ConfirmDialog
        open={paymentToDelete !== null}
        onOpenChange={(o) => !o && setPaymentToDelete(null)}
        title="Delete this payment?"
        description="The fee totals will be recomputed. Any receipts linked to this payment will be unlinked but kept."
        confirmLabel="Delete"
        onConfirm={() => {
          if (paymentToDelete !== null)
            deletePaymentMutation.mutate(paymentToDelete)
          setPaymentToDelete(null)
        }}
      />
      <ConfirmDialog
        open={attachmentToDelete !== null}
        onOpenChange={(o) => !o && setAttachmentToDelete(null)}
        title="Remove receipt?"
        description="This will permanently remove the receipt."
        confirmLabel="Remove"
        onConfirm={() => {
          if (attachmentToDelete !== null)
            deleteAttachmentMutation.mutate(attachmentToDelete)
          setAttachmentToDelete(null)
        }}
      />
    </Dialog>
  )
}
