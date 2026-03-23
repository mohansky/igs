import { Link } from '@tanstack/react-router'
import { site } from '#/lib/site'

const { footer } = site

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="mt-20 border-t border-(--line) px-4 pb-14 pt-10 text-(--sea-ink-soft)">
      <div className="page-wrap grid gap-8 sm:grid-cols-3">
        <div>
          <h3 className="mb-3 text-sm font-semibold text-(--sea-ink)">
            {footer.schoolName}
          </h3>
          <p className="m-0 text-sm leading-relaxed">{footer.tagline}</p>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold text-(--sea-ink)">
            Quick Links
          </h3>
          <ul className="m-0 list-none space-y-1.5 p-0 text-sm">
            {footer.quickLinks.map((link) => (
              <li key={link.to}>
                <Link
                  to={link.to as string}
                  className="no-underline hover:underline"
                  title={link.label}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold text-(--sea-ink)">
            Get in Touch
          </h3>
          <ul className="m-0 list-none space-y-1.5 p-0 text-sm">
            <li>
              <a
                href={`mailto:${footer.contact.email}`}
                className="no-underline hover:underline"
                title={`Email us at ${footer.contact.email}`}
              >
                {footer.contact.email}
              </a>
            </li>
            <li>
              <a
                href={`tel:${footer.contact.phone}`}
                className="no-underline hover:underline"
                title={`Call us at ${footer.contact.phone}`}
              >
                {footer.contact.phone}
              </a>
            </li>
            {footer.contact.hours.map((hour) => (
              <li key={hour}>{hour}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="page-wrap mt-8 border-t border-(--line) pt-6 text-center text-xs">
        <p className="m-0">
          &copy; {year} {footer.copyright}
        </p>
      </div>
    </footer>
  )
}
