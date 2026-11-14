import { useState } from 'react'
import { Link, useMatchRoute } from '@tanstack/react-router'
import { site } from '#/lib/site'
import { authClient } from '#/lib/auth-client'
import ThemeToggle from './ThemeToggle'
import { Button } from './ui/button'
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from './ui/sheet'
import PhoneIcon from './icons/PhoneIcon'
import MailIcon from './icons/MailIcon'
import MenuIcon from './icons/MenuIcon'
import Logo from './icons/Logo'

const { header } = site

export default function Header() {
  const { data: session } = authClient.useSession()
  const [open, setOpen] = useState(false)
  const matchRoute = useMatchRoute()
  const isDashboard = !!matchRoute({ to: '/dashboard', fuzzy: true })

  return (
    <header className="sticky top-0 z-50">
      <PromoBanner />
      <div className="border-b border-(--line) bg-(--header-bg) backdrop-blur-lg">
        <nav className="page-wrap flex items-center justify-between gap-x-3 py-4">
          <Link
            to="/"
            title={site.meta.title}
            className="flex items-center gap-3"
          >
            <Logo className="h-14 md:h-24 w-auto text-(--sea-ink)" />
            <div className="sr-only">{site.meta.title}</div>
          </Link>

          {/* Desktop nav */}
          <div className="hidden items-center gap-7 text-[15px] font-medium md:flex">
            {header.nav.map((item: { label: string; to: string }) => (
              <Link
                key={item.to}
                to={item.to as string}
                className="nav-link"
                activeProps={{ className: 'nav-link is-active' }}
                title={item.label}
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-1.5 md:ml-0 md:gap-2">
            <a
              href={`tel:${header.phone}`}
              className="hidden md:block"
              title={`Call us at ${header.phone}`}
            >
              <Button
                variant="ghost"
                size="sm"
                className="text-(--ink) hover:text-(--accent)"
              >
                <span className="sr-only">Call us</span>
                <PhoneIcon size={20} aria-hidden="true" />
              </Button>
            </a>
            <a
              href={`mailto:${header.email}`}
              className="hidden md:block"
              title={`Email us at ${header.email}`}
            >
              <Button
                variant="ghost"
                size="sm"
                className="text-(--ink) hover:text-(--accent)"
              >
                <span className="sr-only">Email us</span>
                <MailIcon size={20} aria-hidden="true" />
              </Button>
            </a>
            <ThemeToggle />

            <Link
              to="/admissions"
              className="hidden md:inline-flex"
              title="Apply now"
            >
              <span className="btn-paper btn-accent">
                Apply now
                <span aria-hidden style={{ fontSize: 18, lineHeight: 0.8 }}>
                  →
                </span>
              </span>
            </Link>

            {session && (
              <Link
                to="/dashboard"
                className="hidden md:block"
                title="Dashboard"
              >
                <Button variant={isDashboard ? 'default' : 'outline'} size="sm">
                  Dashboard
                </Button>
              </Link>
            )}

            {/* Mobile hamburger */}
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  aria-label="Open menu"
                >
                  <MenuIcon size={36} />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72 bg-(--paper)">
                <SheetHeader>
                  <SheetTitle className="text-(--ink)">Menu</SheetTitle>
                </SheetHeader>
                <div className="flex flex-col gap-1 px-4">
                  {header.nav.map((item: { label: string; to: string }) => (
                    <SheetClose asChild key={item.to}>
                      <Link
                        to={item.to as string}
                        className="nav-link rounded-lg px-3 py-2 text-base font-semibold transition hover:bg-(--link-bg-hover)"
                        activeProps={{ className: 'nav-link is-active' }}
                        onClick={() => setOpen(false)}
                        title={item.label}
                      >
                        {item.label}
                      </Link>
                    </SheetClose>
                  ))}
                </div>
                <div className="mt-4 flex flex-col gap-2 border-t border-(--line) px-4 pt-4">
                  <a
                    href={`tel:${header.phone}`}
                    title={`Call us at ${header.phone}`}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-(--ink-soft) transition hover:bg-(--link-bg-hover) hover:text-(--ink)"
                  >
                    <PhoneIcon size={18} aria-hidden="true" />
                    {header.phone}
                  </a>
                  <a
                    href={`mailto:${header.email}`}
                    title={`Email us at ${header.email}`}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-(--ink-soft) transition hover:bg-(--link-bg-hover) hover:text-(--ink)"
                  >
                    <MailIcon size={18} aria-hidden="true" />
                    {header.email}
                  </a>
                </div>
                <div className="px-4 pt-4">
                  <SheetClose asChild>
                    <Link to="/admissions" onClick={() => setOpen(false)}>
                      <span className="btn-paper btn-accent w-full justify-center">
                        Apply now →
                      </span>
                    </Link>
                  </SheetClose>
                  {session && (
                    <SheetClose asChild>
                      <Link
                        to="/dashboard"
                        onClick={() => setOpen(false)}
                        className="mt-2 block"
                      >
                        <Button
                          variant={isDashboard ? 'default' : 'outline'}
                          className="w-full"
                        >
                          Dashboard
                        </Button>
                      </Link>
                    </SheetClose>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </nav>
      </div>
    </header>
  )
}

function PromoBanner() {
  return (
    <div className="promo-banner font-serif text-center text-[13px] italic leading-tight">
      <span className="inline-flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1">
        Admissions open for 2026-27
        <span aria-hidden className="opacity-70">
          ·
        </span>
        Call us to apply
        <a href="tel:+919731292369">+91 97312 92369</a>
        <span aria-hidden className="opacity-70">
          ·
        </span>
        <a href="tel:+918050718044">+91 80507 18044</a>
      </span>
    </div>
  )
}
