import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { Resend } from 'resend'
import { z } from 'zod'
import { db } from '#/db'
import { contactSubmissions } from '#/db/schema'
import { desc, eq } from 'drizzle-orm'
import { ContactNotification } from '#/emails/contact-notification'
import { requireRole } from './auth-utils'

const contactFormSchema = z.object({
  name: z.string().trim().min(1).max(200),
  phone: z.string().trim().min(1).max(30),
  email: z.email().max(320),
  message: z.string().trim().min(1).max(5000),
  /** Honeypot — should always be empty; bots fill every field */
  website: z.string().optional(),
  /** Client timestamp (ms) when the form mounted; used to reject sub-2s submits */
  formStartedAt: z.number().optional(),
})

const MIN_FILL_MS = 2000

// Best-effort in-memory rate limit. On Cloudflare Workers each isolate has its
// own memory, so this throttles bursts handled by the same isolate but is not a
// global guarantee — upgrade to a KV / Durable Object backed limiter for strict
// enforcement.
const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX = 5
const recentByIp = new Map<string, number[]>()

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const recent = (recentByIp.get(ip) ?? []).filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS,
  )
  if (recent.length >= RATE_LIMIT_MAX) {
    recentByIp.set(ip, recent)
    return true
  }
  recent.push(now)
  if (recent.length === 0) recentByIp.delete(ip)
  else recentByIp.set(ip, recent)
  return false
}

function getClientIp(headers: Headers): string {
  return (
    headers.get('cf-connecting-ip') ??
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown'
  )
}

export const submitContactForm = createServerFn({ method: 'POST' })
  .inputValidator(contactFormSchema)
  .handler(async ({ data }) => {
    // Spam checks — silently return success so bots don't retry with variations.
    if (data.website && data.website.trim() !== '') {
      return { success: true, id: 0 }
    }
    if (
      typeof data.formStartedAt === 'number' &&
      Date.now() - data.formStartedAt < MIN_FILL_MS
    ) {
      return { success: true, id: 0 }
    }

    // Throttle repeated submissions from the same client.
    const ip = getClientIp(getRequest().headers)
    if (isRateLimited(ip)) {
      return { success: true, id: 0 }
    }

    // Save to database
    const [submission] = await db
      .insert(contactSubmissions)
      .values({
        name: data.name,
        phone: data.phone,
        email: data.email,
        subject: 'General Enquiry',
        message: data.message,
      })
      .returning()

    // Send email notification via Resend
    try {
      const resendApiKey = process.env.RESEND_API_KEY
      if (resendApiKey) {
        const resend = new Resend(resendApiKey)
        await resend.emails.send({
          from:
            process.env.RESEND_FROM_EMAIL ??
            'IGS Contact <noreply@indo-german.school>',
          to:
            process.env.CONTACT_NOTIFICATION_EMAIL ??
            'admin@indo-german.school',
          subject: `New Contact Enquiry — ${data.name}`,
          react: ContactNotification({
            name: data.name,
            email: data.email,
            phone: data.phone,
            subject: 'General Enquiry',
            message: data.message,
            submittedAt: new Date().toLocaleString('en-IN', {
              timeZone: 'Asia/Kolkata',
            }),
          }),
        })
      }
    } catch (err) {
      // Log but don't fail the submission if email fails
      console.error('Failed to send contact notification email:', err)
    }

    return { success: true, id: submission.id }
  })

// ── Dashboard queries (staff/admin) ─────────────────────────

export const getContactSubmissions = createServerFn({ method: 'GET' }).handler(
  async () => {
    await requireRole(['admin', 'staff'])
    const submissions = await db
      .select()
      .from(contactSubmissions)
      .orderBy(desc(contactSubmissions.createdAt))

    return submissions
  },
)

export const updateSubmissionStatus = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: { id: number; status: 'new' | 'read' | 'replied' | 'archived' }) =>
      data,
  )
  .handler(async ({ data }) => {
    await requireRole(['admin', 'staff'])
    await db
      .update(contactSubmissions)
      .set({ status: data.status })
      .where(eq(contactSubmissions.id, data.id))

    return { success: true }
  })
