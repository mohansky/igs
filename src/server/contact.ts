import { createServerFn } from '@tanstack/react-start'
import { Resend } from 'resend'
import { db } from '#/db'
import { contactSubmissions } from '#/db/schema'
import { desc, eq } from 'drizzle-orm'
import { ContactNotification } from '#/emails/contact-notification'

export interface ContactFormData {
  name: string
  phone: string
  email: string
  subject: string
  message: string
}

export const submitContactForm = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: ContactFormData) => data,
  )
  .handler(async ({ data }) => {
    // Save to database
    const [submission] = await db
      .insert(contactSubmissions)
      .values({
        name: data.name,
        phone: data.phone,
        email: data.email,
        subject: data.subject,
        message: data.message,
      })
      .returning()

    // Send email notification via Resend
    try {
      const resendApiKey = process.env.RESEND_API_KEY
      if (resendApiKey) {
        const resend = new Resend(resendApiKey)
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL ?? 'IGS Contact <noreply@indo-german.school>',
          to: process.env.CONTACT_NOTIFICATION_EMAIL ?? 'admin@indo-german.school',
          subject: `New Contact: ${data.subject} — ${data.name}`,
          react: ContactNotification({
            name: data.name,
            email: data.email,
            phone: data.phone,
            subject: data.subject,
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
    const submissions = await db
      .select()
      .from(contactSubmissions)
      .orderBy(desc(contactSubmissions.createdAt))

    return submissions
  },
)

export const updateSubmissionStatus = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: { id: number; status: 'new' | 'read' | 'replied' | 'archived' }) => data,
  )
  .handler(async ({ data }) => {
    await db
      .update(contactSubmissions)
      .set({ status: data.status })
      .where(eq(contactSubmissions.id, data.id))

    return { success: true }
  })
