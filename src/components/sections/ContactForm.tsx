import { useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { site } from '#/lib/site'
import { submitContactForm } from '#/server/contact'

const { form } = site.contact

const inputClass =
  'w-full rounded-[10px] px-4 py-3 text-[15px] text-(--ink) bg-(--bg) outline-none transition focus:border-(--accent)'
const labelClass =
  'block mb-1.5 font-mono text-[11px] tracking-[0.1em] uppercase text-(--ink-soft)'
const fieldStyle: React.CSSProperties = {
  border: '1.5px solid var(--ink)',
}

export function ContactForm() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const formStartedAt = useRef(Date.now())

  const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const data = {
      name: formData.get('name') as string,
      phone: formData.get('phone') as string,
      email: formData.get('email') as string,
      message: formData.get('message') as string,
      website: (formData.get('website') as string) ?? '',
      formStartedAt: formStartedAt.current,
    }

    try {
      await submitContactForm({ data })
      // Trigger GTM conversion tag
      ;(window as Window & { dataLayer?: object[] }).dataLayer?.push({
        event: 'contact_form_submit',
      })
      navigate({ to: '/thank-you' })
    } catch (err) {
      console.error(err)
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: '-10000px',
          width: '1px',
          height: '1px',
          overflow: 'hidden',
        }}
      >
        <label htmlFor="website">Website (leave blank)</label>
        <input
          id="website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          defaultValue=""
        />
      </div>

      <div>
        <label htmlFor="name" className={labelClass}>
          Parent / Guardian Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          className={inputClass}
          style={fieldStyle}
          placeholder="Your full name"
        />
      </div>

      <div>
        <label htmlFor="phone" className={labelClass}>
          Phone Number
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          required
          className={inputClass}
          style={fieldStyle}
          placeholder="+91 XXXX XXXX XX"
        />
      </div>

      <div>
        <label htmlFor="email" className={labelClass}>
          Email Address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className={inputClass}
          style={fieldStyle}
          placeholder="your@email.com"
        />
      </div>

      <div>
        <label htmlFor="message" className={labelClass}>
          Message
        </label>
        <textarea
          id="message"
          name="message"
          rows={4}
          required
          className={inputClass}
          style={fieldStyle}
          placeholder="Your message..."
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div>
        <button
          type="submit"
          disabled={loading}
          className="btn-paper btn-accent disabled:opacity-60"
        >
          {loading ? 'Sending...' : 'Send enquiry →'}
        </button>
      </div>
    </form>
  )
}
