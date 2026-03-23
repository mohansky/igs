import { createFileRoute } from '@tanstack/react-router'
import { site, SITE_TITLE } from '#/lib/site'
import { Card, CardContent, CardDescription, CardTitle } from '#/components/ui/card'
import { ContactForm } from '#/components/sections/ContactForm'

export const Route = createFileRoute('/contact')({
  head: () => ({
    meta: [{ title: `Contact Us | ${SITE_TITLE}` }],
  }),
  component: Contact,
})

const { header, address, details, officeHours } = site.contact

function Contact() {
  return (
    <main className="page-wrap px-4 py-12">
      <section className="mb-8">
        <p className="island-kicker mb-2">{header.kicker}</p>
        <h1 className="display-title m-0 text-4xl font-bold tracking-tight text-secondary-foreground sm:text-5xl">
          {header.title}
        </h1>
      </section>

      <div className="grid gap-6 lg:grid-cols-5 mt-20">
        {/* Contact Info */}
        <div className="space-y-6 lg:col-span-2">
          <Card variant="glass">
            <CardContent>
              <CardTitle>{address.title}</CardTitle>
              <CardDescription>
                {address.lines.map((line, i) => (
                  <span key={line}>
                    {i > 0 && <br />}
                    {line}
                  </span>
                ))}
              </CardDescription>
            </CardContent>
          </Card>

          <Card variant="glass" style={{ animationDelay: '90ms' }}>
            <CardContent>
              <CardTitle>{details.title}</CardTitle>
              <ul className="m-0 list-none space-y-2 p-0 text-sm text-muted-foreground">
                {details.items.map((item) => {
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
                    <li key={item.label}>
                      <span className="font-medium text-secondary-foreground">
                        {item.label}
                      </span>{' '}
                      <a href={href} className="text-primary-foreground">
                        {item.value}
                      </a>
                    </li>
                  )
                })}
              </ul>
            </CardContent>
          </Card>

          <Card variant="glass" style={{ animationDelay: '180ms' }}>
            <CardContent>
              <CardTitle>{officeHours.title}</CardTitle>
              <ul className="m-0 list-none space-y-1.5 p-0 text-sm text-muted-foreground">
                {officeHours.hours.map((hour) => (
                  <li key={hour}>{hour}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Contact Form */}
        <div className="lg:col-span-3">
          <ContactForm />
        </div>
      </div>

      {/* Map */}
      <Card
        variant="glass"
        className="rise-in mt-20 overflow-hidden rounded-2xl p-0"
      >
        <iframe
          title="Indo-German School Location"
          src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3887.5!2d77.6595!3d13.0012!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2sKasturi+Nagar%2C+Bengaluru!5e0!3m2!1sen!2sin!4v1"
          width="100%"
          height="400"
          style={{ border: 0 }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </Card>
    </main>
  )
}
