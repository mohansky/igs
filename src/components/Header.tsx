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
import IGSLogo from './icons/IGSLogo'

const { header } = site

export default function Header() {
  const { data: session } = authClient.useSession()
  const [open, setOpen] = useState(false)
  const matchRoute = useMatchRoute()
  const isDashboard = !!matchRoute({ to: '/dashboard', fuzzy: true })

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-(--header-bg) px-4 backdrop-blur-lg">
      <nav className="page-wrap flex items-center justify-between gap-x-3 py-3 sm:py-4">
        <h2 className="m-0 shrink-0 text-base font-semibold tracking-tight">
          <Link to="/" title={site.meta.title}>
            <span className="sr-only">{site.meta.title}</span>
            <IGSLogo height={20} className="text-foreground" />
          </Link>
        </h2>

        {/* Desktop nav */}
        <div className="hidden items-center gap-x-4 text-sm font-semibold sm:flex">
          {header.nav.map((item) => (
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

        <div className="ml-auto flex items-center gap-1.5 sm:ml-0 sm:gap-2">
          <a href={`tel:${header.phone}`} className="hidden sm:block" title={`Call us at ${header.phone}`}>
            <Button variant="ghost" size="sm" className="stroke-ring">
              <span className="sr-only">Call us</span>
              <PhoneIcon size={20} aria-hidden="true" />
            </Button>
          </a>
          <a href={`mailto:${header.email}`} className="hidden sm:block" title={`Email us at ${header.email}`}>
            <Button variant="ghost" size="sm" className="stroke-ring">
              <span className="sr-only">Email us</span>
              <MailIcon size={20} aria-hidden="true" />
            </Button>
          </a>
          <ThemeToggle />
          {/* {session ? (
            <Link to="/dashboard" className="hidden sm:block" title="Dashboard">
              <Button variant={isDashboard ? 'default' : 'outline'} size="sm">
                Dashboard
              </Button>
            </Link>
          ) : (
            <Link
              to="/sign-in"
              activeProps={{ className: 'nav-link is-active' }}
              className="hidden sm:block"
              title="Sign In"
            >
              <Button size="sm">Sign In</Button>
            </Link>
          )} */}

          {/* Mobile hamburger */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="sm:hidden"
                aria-label="Open menu"
              >
                <MenuIcon size={24} />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 bg-(--surface)">
              <SheetHeader>
                <SheetTitle className="text-foreground">Menu</SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-1 px-4">
                {header.nav.map((item) => (
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
              <div className="mt-4 flex flex-col gap-2 border-t border-border px-4 pt-4">
                <a
                  href={`tel:${header.phone}`}
                  title={`Call us at ${header.phone}`}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-(--sea-ink-soft) transition hover:bg-(--link-bg-hover) hover:text-(--sea-ink)"
                >
                  <PhoneIcon size={18} aria-hidden="true" />
                  {header.phone}
                </a>
                <a
                  href={`mailto:${header.email}`}
                  title={`Email us at ${header.email}`}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-(--sea-ink-soft) transition hover:bg-(--link-bg-hover) hover:text-(--sea-ink)"
                >
                  <MailIcon size={18} aria-hidden="true" />
                  {header.email}
                </a>
              </div>
              <div className="px-4 pt-4">
                <SheetClose asChild>
                  {session ? (
                    <Link to="/dashboard" onClick={() => setOpen(false)}>
                      <Button
                        variant={isDashboard ? 'default' : 'outline'}
                        className="w-full"
                      >
                        Dashboard
                      </Button>
                    </Link>
                  ) : (
                    <Link to="/sign-in" onClick={() => setOpen(false)}>
                      <Button className="w-full">Sign In</Button>
                    </Link>
                  )}
                </SheetClose>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </header>
  )
}
