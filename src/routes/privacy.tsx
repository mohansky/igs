import { createFileRoute } from '@tanstack/react-router'
import { site, SITE_TITLE } from '#/lib/site'
import { Card } from '#/components/ui/card'

export const Route = createFileRoute('/privacy')({
  head: () => ({
    meta: [
      { title: `Privacy Policy | ${SITE_TITLE}` },
      {
        name: 'description',
        content:
          'How Indo-German School collects, uses, stores and protects your personal information.',
      },
    ],
  }),
  component: PrivacyPolicy,
})

const { email, phone } = site.footer.contact

function PrivacyPolicy() {
  return (
    <main className="page-wrap px-4 pb-16 pt-16">
      <Card
        variant="glass"
        className="mx-auto max-w-3xl rounded-2xl p-6 sm:p-10"
      >
        <p className="island-kicker mb-2">Legal</p>
        <h1 className="display-title mb-2 text-4xl font-bold text-(--sea-ink) sm:text-5xl">
          Privacy Policy
        </h1>
        <p className="mb-8 text-sm text-(--sea-ink-soft)">
          Last updated: June 2026
        </p>

        <div className="prose prose-slate max-w-none prose-headings:text-(--sea-ink) prose-p:text-(--sea-ink-soft) prose-li:text-(--sea-ink-soft) prose-ul:text-(--sea-ink-soft) prose-strong:text-(--sea-ink) prose-a:text-(--lagoon-deep)">
          <h2>About Us</h2>
          <p>
            Anjali Trust operates an inclusive preschool and primary school in
            Kasturi Nagar, Bangalore, India, offering early childhood education
            from Playgroup to UKG for children aged 2 to 6.
          </p>

          <h2>Information We Collect</h2>
          <p>
            We collect personal information only when necessary for admission
            and enrollment purposes. This includes:
          </p>
          <ul>
            <li>Child&apos;s name, date of birth, and class applying for</li>
            <li>Parent or guardian name, phone number, and address</li>
            <li>
              Any relevant information about the child&apos;s educational or
              developmental needs shared voluntarily by the parent
            </li>
          </ul>
          <p>
            We also collect basic contact information from parents who submit
            enquiries through our website or contact us via phone or WhatsApp.
          </p>

          <h2>How We Use Your Information</h2>
          <p>
            Information collected is used solely for the following purposes:
          </p>
          <ul>
            <li>Responding to admission enquiries</li>
            <li>Processing enrollment and maintaining student records</li>
            <li>
              Communicating with parents regarding school updates, fees, and
              events
            </li>
            <li>
              Complying with regulatory requirements as an educational
              institution
            </li>
          </ul>

          <h2>How We Store Your Information</h2>
          <p>
            Physical records are stored securely at the school premises with
            restricted access. Digital records are maintained by school
            management using password protected systems. We retain records for
            as long as a child is enrolled and for a reasonable period
            thereafter as required by law.
          </p>

          <h2>What We Do Not Do</h2>
          <ul>
            <li>
              We do not sell, rent, or share your personal information with
              third parties
            </li>
            <li>
              We do not use your information for marketing purposes beyond
              communicating about our own school
            </li>
            <li>
              We do not collect payment information online — all fee payments
              are made directly via bank transfer
            </li>
          </ul>

          <h2>Cookies</h2>
          <p>
            Our website may use basic cookies to improve your browsing
            experience. We do not use cookies to track users across other
            websites or for advertising profiling purposes.
          </p>

          <h2>Your Rights</h2>
          <p>
            You may request access to, correction of, or deletion of your
            personal information at any time by contacting us directly.
          </p>

          <h2>Contact Us</h2>
          <p>
            If you have any questions about this privacy policy or how we handle
            your information, please contact us at:
          </p>
          <address className="not-italic">
            <strong>Anjali Trust</strong>
            <br />
            Indo-German School
            <br />
            Kasturi Nagar, Bangalore — 560043
            <br />
            <a href={`tel:${phone.replace(/\s+/g, '')}`}>{phone}</a>
            <br />
            <a href={`mailto:${email}`}>{email}</a>
          </address>
        </div>
      </Card>
    </main>
  )
}
