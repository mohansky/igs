import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { formatCurrency } from '#/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { recordPayment } from '#/server/fees'

interface FeeRecord {
  id: number
  amount: number
  paidAmount: number | null
  description: string | null
}

export function RecordPaymentDialog({
  fee,
  open,
  onOpenChange,
  onPaid,
}: {
  fee: FeeRecord | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onPaid: () => void
}) {
  const [paidAmount, setPaidAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [receiptNumber, setReceiptNumber] = useState('')

  const remaining = fee ? fee.amount - (fee.paidAmount ?? 0) : 0

  const payMutation = useMutation({
    mutationFn: () =>
      recordPayment({
        data: {
          feeId: fee!.id,
          paidAmount: Number(paidAmount),
          paymentMethod,
          receiptNumber: receiptNumber || undefined,
        },
      }),
    onSuccess: () => {
      onOpenChange(false)
      setPaidAmount('')
      setReceiptNumber('')
      onPaid()
    },
    onError: () => toast.error('Failed to record payment'),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!fee) return
    payMutation.mutate()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
        </DialogHeader>
        {fee && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {fee.description ?? 'Fee'} — Remaining: {formatCurrency(remaining)}
            </p>
            <div className="space-y-2">
              <Label htmlFor="paid-amount">Amount</Label>
              <Input
                id="paid-amount"
                type="number"
                step="0.01"
                max={remaining}
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment-method">Payment Method</Label>
              <select
                id="payment-method"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="receipt-number">Receipt Number (optional)</Label>
              <Input
                id="receipt-number"
                value={receiptNumber}
                onChange={(e) => setReceiptNumber(e.target.value)}
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={payMutation.isPending}
            >
              {payMutation.isPending ? 'Recording...' : 'Record Payment'}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
