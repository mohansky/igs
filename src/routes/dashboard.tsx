import {
  createFileRoute,
  Link,
  Outlet,
  redirect,
  useMatchRoute,
} from '@tanstack/react-router'
import { useState } from 'react'
import { getSession } from '#/server/auth'
import { SITE_TITLE } from '#/lib/site'
import { authClient } from '#/lib/auth-client'
import { getSidebarOpen, setSidebarOpen } from '#/lib/preferences'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '#/components/ui/sidebar'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '#/components/ui/collapsible'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import { Separator } from '#/components/ui/separator'
import IGSLogo from '#/components/icons/Logo'
import {
  Home09Icon,
  Calendar03Icon,
  Invoice02Icon,
  FileAttachmentIcon,
  StudentIcon,
  TimeScheduleIcon,
  UserMultipleIcon,
  UserGroupIcon,
  Book02Icon,
  UserIcon,
  HelpCircleIcon,
  CalendarCheckIn01Icon,
  MoneyReceiveSquareIcon,
  MoneySendSquareIcon,
  ArrowRight01Icon,
  Logout03Icon,
  UnfoldMoreIcon,
  UserSearch01Icon,
} from 'hugeicons-react'
import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarImage,
} from '#/components/ui/avatar'
import { CommandPalette } from '#/components/dashboard/command-palette'

type UserRole = string

interface NavItem {
  to: string
  label: string
  roles: UserRole[]
  group: 'main' | 'admin'
  icon: React.ComponentType<{ className?: string }>
}

const navItems: NavItem[] = [
  {
    to: '/dashboard',
    label: 'Overview',
    roles: ['admin', 'staff', 'student'],
    group: 'main',
    icon: Home09Icon,
  },
  {
    to: '/dashboard/attendance',
    label: 'Attendance',
    roles: ['admin', 'staff', 'student'],
    group: 'main',
    icon: Calendar03Icon,
  },
  {
    to: '/dashboard/fees',
    label: 'Fees',
    // Admins see this under Administration; students/parents get it in
    // their flat nav (they view and pay their own fees). Staff: no access.
    roles: ['admin', 'student'],
    group: 'admin',
    icon: Invoice02Icon,
  },
  {
    to: '/dashboard/calendar',
    label: 'Calendar',
    roles: ['admin', 'staff', 'student'],
    group: 'main',
    icon: CalendarCheckIn01Icon,
  },
  {
    to: '/dashboard/enquiries',
    label: 'Enquiries',
    roles: ['admin', 'staff'],
    group: 'main',
    icon: UserSearch01Icon,
  },
  {
    to: '/dashboard/submissions',
    label: 'Submissions',
    roles: ['admin', 'staff'],
    group: 'main',
    icon: FileAttachmentIcon,
  },
  {
    to: '/dashboard/students',
    label: 'Students',
    roles: ['admin', 'staff'],
    group: 'main',
    icon: StudentIcon,
  },
  {
    to: '/dashboard/my-attendance',
    label: 'My Attendance',
    roles: ['staff'],
    group: 'main',
    icon: TimeScheduleIcon,
  },
  {
    to: '/dashboard/my-salaries',
    label: 'My Salaries',
    roles: ['staff'],
    group: 'main',
    icon: MoneySendSquareIcon,
  },
  {
    to: '/dashboard/staff',
    label: 'Staff',
    roles: ['admin'],
    group: 'admin',
    icon: UserGroupIcon,
  },
  {
    to: '/dashboard/staff-attendance',
    label: 'Staff Attendance',
    roles: ['admin'],
    group: 'admin',
    icon: TimeScheduleIcon,
  },
  {
    to: '/dashboard/salaries',
    label: 'Staff Salaries',
    roles: ['admin'],
    group: 'admin',
    icon: MoneySendSquareIcon,
  },
  {
    to: '/dashboard/users',
    label: 'Users',
    roles: ['admin'],
    group: 'admin',
    icon: UserMultipleIcon,
  },
  {
    to: '/dashboard/classes',
    label: 'Classes',
    roles: ['admin'],
    group: 'admin',
    icon: Book02Icon,
  },
  {
    to: '/dashboard/expenses',
    label: 'Expenses',
    roles: ['admin'],
    group: 'admin',
    icon: MoneyReceiveSquareIcon,
  },
]

export const Route = createFileRoute('/dashboard')({
  head: () => ({
    meta: [{ title: `Dashboard | ${SITE_TITLE}` }],
  }),
  beforeLoad: async () => {
    const session = await getSession()
    if (!session) {
      throw redirect({ to: '/sign-in' })
    }
    return { session }
  },
  component: DashboardLayout,
})

function DashboardLayout() {
  const { session } = Route.useRouteContext()
  const userRole = (session.user as { role?: string }).role ?? 'student'
  const matchRoute = useMatchRoute()
  const [sidebarOpen, setSidebarOpenState] = useState(getSidebarOpen)

  const filteredNav = navItems.filter((item) => item.roles.includes(userRole))
  // The Administration group only renders for admins; everyone else gets
  // their items as one flat list (e.g. Fees is admin-grouped but also
  // visible to staff/students)
  const mainItems =
    userRole === 'admin'
      ? filteredNav.filter((item) => item.group === 'main')
      : filteredNav
  const adminItems =
    userRole === 'admin'
      ? filteredNav.filter((item) => item.group === 'admin')
      : []

  const getAvatarUrl = (image: string | null | undefined) => {
    if (!image) return undefined // let AvatarFallback handle it
    if (image.startsWith('http') || image.startsWith('data:')) return image
    const base = import.meta.env.VITE_R2_BASE_URL ?? ''
    if (!base) return image.startsWith('/') ? image : `/${image}`
    const baseWithSlash = base.endsWith('/') ? base : `${base}/`
    return `${baseWithSlash}${image.replace(/^\//, '')}`
  }

  // Role indicator — color-coded by role
  const roleBadgeColor =
    {
      admin: 'bg-red-500',
      staff: 'bg-blue-500',
      student: 'bg-green-600',
    }[userRole] ?? 'bg-gray-400'

  const handleSignOut = async () => {
    await authClient.signOut()
    window.location.href = '/sign-in'
  }

  return (
    <SidebarProvider
      open={sidebarOpen}
      onOpenChange={(open) => {
        setSidebarOpenState(open)
        setSidebarOpen(open)
      }}
    >
      <Sidebar collapsible="icon" variant="inset">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild>
                <Link to="/dashboard">
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <IGSLogo height={16} className="text-primary-foreground" />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">
                      IGS Dashboard
                    </span>
                    <span className="truncate text-xs capitalize text-muted-foreground">
                      {userRole}
                    </span>
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          <Collapsible defaultOpen className="group/collapsible mt-10">
            <SidebarGroup>
              <SidebarGroupLabel asChild>
                <CollapsibleTrigger>
                  Navigation
                  <ArrowRight01Icon className="ml-auto size-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                </CollapsibleTrigger>
              </SidebarGroupLabel>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {mainItems.map((item) => {
                      const isActive = !!matchRoute({
                        to: item.to,
                        fuzzy: false,
                      })
                      return (
                        <SidebarMenuItem key={item.to}>
                          <SidebarMenuButton
                            asChild
                            isActive={isActive}
                            tooltip={item.label}
                          >
                            <Link to={item.to}>
                              <item.icon className="size-4" />
                              <span>{item.label}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      )
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>

          {adminItems.length > 0 && (
            <Collapsible defaultOpen className="group/collapsible">
              <SidebarGroup>
                <SidebarGroupLabel asChild>
                  <CollapsibleTrigger>
                    Administration
                    <ArrowRight01Icon className="ml-auto size-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                  </CollapsibleTrigger>
                </SidebarGroupLabel>
                <CollapsibleContent>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {adminItems.map((item) => {
                        const isActive = !!matchRoute({
                          to: item.to,
                          fuzzy: false,
                        })
                        return (
                          <SidebarMenuItem key={item.to}>
                            <SidebarMenuButton
                              asChild
                              isActive={isActive}
                              tooltip={item.label}
                            >
                              <Link to={item.to}>
                                <item.icon className="size-4" />
                                <span>{item.label}</span>
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        )
                      })}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </SidebarGroup>
            </Collapsible>
          )}
        </SidebarContent>

        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    size="lg"
                    className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                  >
                    <Avatar className="size-8 rounded-lg">
                      <AvatarImage
                        src={getAvatarUrl(session.user.image)}
                        alt={session.user.name}
                        className="object-cover"
                      />
                      <AvatarFallback className="rounded-lg">
                        {session.user.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .slice(0, 2)
                          .toUpperCase()}
                      </AvatarFallback>
                      <AvatarBadge className={roleBadgeColor} />
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">
                        {session.user.name}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {session.user.email}
                      </span>
                    </div>
                    <UnfoldMoreIcon className="ml-auto size-4" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                  side="bottom"
                  align="end"
                  sideOffset={4}
                >
                  <DropdownMenuLabel className="p-0 font-normal">
                    <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                      <Avatar className="size-8 rounded-lg">
                        <AvatarImage
                          src={getAvatarUrl(session.user.image)}
                          alt={session.user.name}
                          className="object-cover"
                        />
                        <AvatarFallback className="rounded-lg">
                          {session.user.name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')
                            .slice(0, 2)
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="grid flex-1 text-left text-sm leading-tight">
                        <span className="truncate font-semibold">
                          {session.user.name}
                        </span>
                        <span className="truncate text-xs text-muted-foreground">
                          {session.user.email}
                        </span>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem asChild>
                      <Link to="/dashboard/profile">
                        <UserIcon className="size-4" />
                        Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/dashboard/docs">
                        <HelpCircleIcon className="size-4" />
                        Help
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <Logout03Icon className="size-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <span className="text-sm font-medium text-muted-foreground">
            {session.user.name}
          </span>
          <div className="ml-auto hidden items-center gap-1 rounded-md border px-2 py-0.5 text-xs text-muted-foreground sm:flex">
            <span>Search</span>
            <kbd className="rounded border bg-muted px-1 font-mono text-[10px]">
              Ctrl
            </kbd>
            <kbd className="rounded border bg-muted px-1 font-mono text-[10px]">
              K
            </kbd>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 lg:p-8">
          <Outlet />
        </main>
      </SidebarInset>
      <CommandPalette userRole={userRole as 'admin' | 'staff' | 'student'} />
    </SidebarProvider>
  )
}
