import { createFileRoute } from '@tanstack/react-router'
import { site, SITE_TITLE } from '#/lib/site'
import { ContactForm } from '#/components/sections/ContactForm'
import { Hero } from '#/components/sections/Hero'
import { SketchBicycle, SketchStar } from '#/components/Sketches'

export const Route = createFileRoute('/contact')({
  head: () => ({
    meta: [{ title: `Contact Us | ${SITE_TITLE}` }],
  }),
  component: Contact,
})

const { header, address, details, officeHours } = site.contact

function Contact() {
  return (
    <main>
      {/* Hero */}
      <div className="page-wrap pt-8 pb-16">
        <Hero
          kicker={header.kicker}
          headlineMaxWidth="16ch"
          title={
            <>
              We'd love to <em>hear</em> from you.
            </>
          }
          description="Drop us a line, give us a ring, or come over. The kettle is always on."
        />
      </div>

      {/* Contact card with details + map */}
      <section className="pb-24">
        <div className="page-wrap">
          <div className="contact-card">
            <div>
              <div className="row">
                <b>{address.title}</b>
                <span>
                  {address.lines.map((line: string, i: number) => (
                    <span key={line}>
                      {i > 0 && <br />}
                      {line}
                    </span>
                  ))}
                </span>
              </div>

              <div className="row">
                <b>{details.title}</b>
                <ul className="m-0 list-none p-0 space-y-1.5">
                  {details.items.map(
                    (item: { label: string; value: string }) => {
                      const label = item.label.toLowerCase()
                      const digits = item.value.replace(/[\s\-()]/g, '')
                      const href = label.includes('email')
                        ? `mailto:${item.value}`
                        : label.includes('whatsapp')
                          ? `https://wa.me/${digits.replace('+', '')}`
                          : label.includes('phone')
                            ? `tel:${digits}`
                            : item.value
                      return (
                        <li key={`${item.label}-${item.value}`}>
                          <span className="font-mono text-[11px] uppercase tracking-wider text-(--ink-soft) mr-2">
                            {item.label}
                          </span>
                          <a
                            href={href}
                            className="text-(--ink) hover:text-(--accent)"
                          >
                            {item.value}
                          </a>
                        </li>
                      )
                    },
                  )}
                </ul>
              </div>

              <div className="row">
                <b>{officeHours.title}</b>
                <ul className="m-0 list-none p-0 space-y-1 text-(--ink-soft)">
                  {officeHours.hours.map((hour: string) => (
                    <li key={hour}>{hour}</li>
                  ))}
                </ul>
              </div>

              <div className="mt-6">
                <SketchBicycle size={140} color="var(--accent)" />
              </div>
            </div>

            <div
              className="relative rounded-[12px] overflow-hidden"
              style={{
                border: '1.5px solid var(--ink)',
                minHeight: 360,
              }}
            >
              <iframe
                title="Indo-German School Location"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3887.4959212845592!2d77.65561677490629!3d13.004060387314302!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bae112df577afe7%3A0x50cd5d181de0fd3!2sIndo-German%20School!5e0!3m2!1sen!2sin!4v1777483719361!5m2!1sen!2sin"
                width="100%"
                height="100%"
                style={{ border: 0, display: 'block', minHeight: 360 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
              <div
                className="float wiggle pointer-events-none"
                style={{ top: '40%', left: '40%' }}
              >
                <SketchStar size={36} color="var(--accent)" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Form */}
      <section className="pb-24">
        <div className="page-wrap">
          <div className="contact-card">
            <div>
              <div className="section-eyebrow">Send us a message</div>
              <h4>Got a question for us?</h4>
              <p className="text-(--ink-soft) text-[15px] mt-2">
                Fill in the form and we'll get back to you within 1–2 working
                days.
              </p>
            </div>
            <ContactForm />
          </div>
        </div>
      </section>
    </main>
  )
}
