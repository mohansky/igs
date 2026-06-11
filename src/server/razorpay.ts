import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { eq, sql } from 'drizzle-orm'
import { db } from '#/db'
import { feePayments, fees } from '#/db/schema'
import { auth } from '#/lib/auth'

async function requireSession() {
  const request = getRequest()
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) throw new Error('Unauthorized')
  return session
}

function getKeys() {
  const keyId = process.env.RAZORPAY_KEY_ID
  const keySecret = process.env.RAZORPAY_KEY_SECRET
  if (!keyId || !keySecret) {
    throw new Error(
      'Razorpay keys not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env.local',
    )
  }
  return { keyId, keySecret }
}

export const createRazorpayOrderForFee = createServerFn({ method: 'POST' })
  .inputValidator((data: { feeId: number }) => data)
  .handler(async ({ data }) => {
    await requireSession()
    const { keyId, keySecret } = getKeys()

    const [fee] = await db
      .select()
      .from(fees)
      .where(eq(fees.id, data.feeId))
      .limit(1)

    if (!fee) throw new Error('Fee record not found')
    if (fee.status === 'paid') throw new Error('Fee is already paid')

    const remaining = fee.amount - (fee.paidAmount ?? 0)
    if (remaining <= 0) throw new Error('Nothing to pay on this fee')

    // Razorpay amounts are in paise (smallest currency unit)
    const amountInPaise = Math.round(remaining * 100)

    const auth64 = btoa(`${keyId}:${keySecret}`)
    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth64}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amountInPaise,
        currency: 'INR',
        receipt: `fee_${fee.id}`,
        notes: {
          feeId: String(fee.id),
          description: fee.description ?? '',
        },
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      throw new Error(`Razorpay order creation failed: ${errText}`)
    }

    const order = (await response.json()) as {
      id: string
      amount: number
      currency: string
    }

    return {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId,
      feeId: fee.id,
      description: fee.description,
    }
  })

async function verifySignature(
  payload: string,
  signature: string,
  secret: string,
): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sigBuffer = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(payload),
  )
  const expected = Array.from(new Uint8Array(sigBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

  if (expected.length !== signature.length) return false
  let result = 0
  for (let i = 0; i < expected.length; i++) {
    result |= expected.charCodeAt(i) ^ signature.charCodeAt(i)
  }
  return result === 0
}

export const verifyRazorpayPayment = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      feeId: number
      orderId: string
      paymentId: string
      signature: string
    }) => data,
  )
  .handler(async ({ data }) => {
    const session = await requireSession()
    const { keySecret } = getKeys()

    const valid = await verifySignature(
      `${data.orderId}|${data.paymentId}`,
      data.signature,
      keySecret,
    )
    if (!valid) throw new Error('Invalid Razorpay signature')

    const [existing] = await db
      .select()
      .from(fees)
      .where(eq(fees.id, data.feeId))
      .limit(1)

    if (!existing) throw new Error('Fee record not found')
    if (existing.status === 'paid') {
      // Idempotency: signature was valid, fee already paid — return success
      return { success: true, alreadyPaid: true }
    }

    const remaining = existing.amount - (existing.paidAmount ?? 0)
    const paidDate = new Date().toISOString().slice(0, 10)

    await db.insert(feePayments).values({
      feeId: data.feeId,
      amount: remaining,
      paidDate,
      paymentMethod: 'razorpay',
      receiptNumber: data.paymentId,
      razorpayOrderId: data.orderId,
      razorpayPaymentId: data.paymentId,
      receivedByUserId: session.user.id,
    })

    // Recompute fees row from the payment ledger.
    const [{ total }] = await db
      .select({ total: sql<number>`COALESCE(SUM(${feePayments.amount}), 0)` })
      .from(feePayments)
      .where(eq(feePayments.feeId, data.feeId))
    const newPaid = Number(total) || 0
    const status = newPaid >= existing.amount ? 'paid' : 'partial'

    await db
      .update(fees)
      .set({
        paidAmount: newPaid,
        paidDate,
        status,
        paymentMethod: 'razorpay',
        receiptNumber: data.paymentId,
        razorpayOrderId: data.orderId,
        razorpayPaymentId: data.paymentId,
        receivedByUserId: session.user.id,
        updatedAt: new Date(),
      })
      .where(eq(fees.id, data.feeId))

    return { success: true, alreadyPaid: false }
  })
