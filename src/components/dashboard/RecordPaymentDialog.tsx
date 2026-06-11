import { useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { FileAttachmentIcon } from 'hugeicons-react'
import { cn, formatCurrency } from '#/lib/utils'
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
import { uploadToR2 } from '#/server/upload'
import { addFeeAttachment } from '#/server/feeAttachments'

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

  const [receiptTitle, setReceiptTitle] = useState('')
  const [receiptMode, setReceiptMode] = useState<'file' | 'link'>('file')
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [receiptLink, setReceiptLink] = useState('')
  const receiptInputRef = useRef<HTMLInputElement>(null)

  const remaining = fee ? fee.amount - (fee.paidAmount ?? 0) : 0

  const resetReceipt = () => {
    setReceiptTitle('')
    setReceiptMode('file')
    setReceiptFile(null)
    setReceiptLink('')
    if (receiptInputRef.current) receiptInputRef.current.value = ''
  }

  const hasReceipt =
    receiptMode === 'file' ? !!receiptFile : receiptLink.trim().length > 0

  const payMutation = useMutation({
    mutationFn: async () => {
      const result = await recordPayment({
        data: {
          feeId: fee!.id,
          paidAmount: Number(paidAmount),
          paymentMethod,
          receiptNumber: receiptNumber || undefined,
        },
      })
      const paymentId = (result as { paymentId?: number }).paymentId ?? null

      if (hasReceipt) {
        let attachmentUrl: string
        let attachmentType: string

        if (receiptMode === 'file' && receiptFile) {
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = (e) =>
              resolve(((e.target?.result as string) || '').split(',')[1])
            reader.onerror = reject
            reader.readAsDataURL(receiptFile)
          })
          const uploaded = await uploadToR2({
            data: {
              file: base64,
              fileName: receiptFile.name,
              mimeType: receiptFile.type,
              folder: 'fee-receipts',
            },
          })
          attachmentUrl = uploaded.url
          attachmentType = 'file'
        } else {
          attachmentUrl = receiptLink.trim()
          attachmentType = 'link'
        }

        await addFeeAttachment({
          data: {
            feeId: fee!.id,
            feePaymentId: paymentId,
            title: receiptTitle.trim() || 'Receipt',
            description: null,
            attachmentUrl,
            attachmentType,
          },
        })
      }

      return result
    },
    onSuccess: () => {
      onOpenChange(false)
      setPaidAmount('')
      setReceiptNumber('')
      resetReceipt()
      onPaid()
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to record payment'),
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
              {fee.description ?? 'Fee'} — Remaining:{' '}
              {formatCurrency(remaining)}
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

            <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
              <Label>Receipt attachment (optional)</Label>
              <Input
                placeholder="Title (e.g. UPI screenshot)"
                value={receiptTitle}
                onChange={(e) => setReceiptTitle(e.target.value)}
              />
              <div className="flex gap-1">
                {(['file', 'link'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      setReceiptMode(m)
                      setReceiptFile(null)
                      setReceiptLink('')
                    }}
                    className={cn(
                      'rounded-md px-3 py-1 text-sm border transition-colors',
                      receiptMode === m
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-input hover:bg-muted',
                    )}
                  >
                    {m === 'file' ? 'Upload file' : 'External link'}
                  </button>
                ))}
              </div>
              {receiptMode === 'file' ? (
                <div className="space-y-1.5">
                  <input
                    ref={receiptInputRef}
                    type="file"
                    accept="image/jpeg,image/png,application/pdf"
                    className="hidden"
                    onChange={(e) =>
                      setReceiptFile(e.target.files?.[0] ?? null)
                    }
                  />
                  {receiptFile ? (
                    <div className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm">
                      <FileAttachmentIcon className="size-4 shrink-0 text-muted-foreground" />
                      <span className="truncate flex-1">
                        {receiptFile.name}
                      </span>
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          setReceiptFile(null)
                          if (receiptInputRef.current)
                            receiptInputRef.current.value = ''
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => receiptInputRef.current?.click()}
                    >
                      Choose file
                    </Button>
                  )}
                  <p className="text-xs text-muted-foreground">
                    JPG, PNG, PDF · Max 5 MB
                  </p>
                </div>
              ) : (
                <Input
                  value={receiptLink}
                  onChange={(e) => setReceiptLink(e.target.value)}
                  placeholder="https://drive.google.com/..."
                  type="url"
                />
              )}
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
