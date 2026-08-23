import { Link } from '@tanstack/react-router'
import { site } from '#/lib/site'
import Logo from './icons/Logo'

const { footer, home } = site

export default function Footer() {
  const year = new Date().getFullYear()
  const programmes = home.programmes.items

  return (
    <footer className="site-footer">
      <div className="page-wrap">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 md:grid-cols-[2fr_1fr_1fr_1.2fr] mb-14">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <Logo className="h-30 w-auto text-(--sea-ink)" />
              <div className="sr-only">{site.meta.title}</div>
            </div>
          </div>

          <div>
            <h5>Visit</h5>
            <ul className="m-0 list-none space-y-2.5 p-0 text-[15px]">
              {footer.quickLinks.map((link: { label: string; to: string }) => (
                <li key={link.to}>
                  <Link
                    to={link.to as string}
                    className="text-(--ink) hover:text-(--accent)"
                    title={link.label}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h5>Programmes</h5>
            <ul className="m-0 list-none space-y-2.5 p-0 text-[15px]">
              {programmes.map((p: { title: string }) => (
                <li key={p.title} className="text-(--ink)">
                  {p.title}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h5>Get in touch</h5>
            <ul className="m-0 list-none space-y-2.5 p-0 text-[15px]">
              <li>
                <a
                  href={`mailto:${footer.contact.email}`}
                  className="text-(--ink) hover:text-(--accent)"
                  title={`Email us at ${footer.contact.email}`}
                >
                  {footer.contact.email}
                </a>
              </li>
              <li>
                <a
                  href={`tel:${footer.contact.phone}`}
                  className="text-(--ink) hover:text-(--accent)"
                  title={`Call us at ${footer.contact.phone}`}
                >
                  {footer.contact.phone}
                </a>
              </li>
              {footer.contact.hours.map((hour: string) => (
                <li key={hour} className="text-(--ink-soft)">
                  {hour}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center text-[12px] tracking-[0.05em] font-mono text-(--ink-soft)">
          <span className="flex items-center gap-3">
            © {year} INDO-GERMAN SCHOOL
            <Link
              to="/privacy"
              className="hover:text-(--accent)"
              title="Privacy Policy"
            >
              Privacy Policy
            </Link>
          </span>
          <span>
            Designed and developed by{' '}
            <a
              href="https://mohankumar.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="text-(--accent) hover:underline"
            >
              Mohan Kumar
            </a>
          </span>
        </div>
      </div>
    </footer>
  )
}
