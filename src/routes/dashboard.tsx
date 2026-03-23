import {
  createFileRoute,
  Link,
  Outlet,
  redirect,
  useMatchRoute,
} from '@tanstack/react-router'
import { getSession } from '#/server/auth'
import { SITE_TITLE } from '#/lib/site'
import { authClient } from '#/lib/auth-client'
import { Button } from '#/components/ui/button'
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
import { Separator } from '#/components/ui/separator'
import IGSLogo from '#/components/icons/IGSLogo'
import {
  Home09Icon,
  Calendar03Icon,
  Invoice02Icon,
  FileAttachmentIcon,
  StudentIcon,
  TimeScheduleIcon,
  UserMultipleIcon,
  Book02Icon,
  UserIcon,
  HelpCircleIcon,
  CalendarCheckIn01Icon,
} from 'hugeicons-react'

type UserRole = string

interface NavItem {
  to: string
  label: string
  roles: UserRole[]
  group: 'main' | 'admin' | 'account'
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
    roles: ['admin', 'staff', 'student'],
    group: 'main',
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
    to: '/dashboard/staff-attendance',
    label: 'Staff Attendance',
    roles: ['admin'],
    group: 'admin',
    icon: TimeScheduleIcon,
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
    to: '/dashboard/profile',
    label: 'Profile',
    roles: ['admin', 'staff', 'student'],
    group: 'account',
    icon: UserIcon,
  },
  {
    to: '/dashboard/docs',
    label: 'Help',
    roles: ['admin', 'staff', 'student'],
    group: 'account',
    icon: HelpCircleIcon,
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

  const filteredNav = navItems.filter((item) => item.roles.includes(userRole))
  const mainItems = filteredNav.filter((item) => item.group === 'main')
  const adminItems = filteredNav.filter((item) => item.group === 'admin')
  const accountItems = filteredNav.filter((item) => item.group === 'account')

  const handleSignOut = async () => {
    await authClient.signOut()
    window.location.href = '/sign-in'
  }

  return (
    <SidebarProvider>
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
                    <span className="truncate font-semibold">IGS Dashboard</span>
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
          <SidebarGroup>
            <SidebarGroupLabel>Navigation</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {mainItems.map((item) => {
                  const isActive = !!matchRoute({ to: item.to, fuzzy: false })
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
          </SidebarGroup>

          {adminItems.length > 0 && (
            <SidebarGroup>
              <SidebarGroupLabel>Administration</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {adminItems.map((item) => {
                    const isActive = !!matchRoute({ to: item.to, fuzzy: false })
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
            </SidebarGroup>
          )}

          <SidebarGroup>
            <SidebarGroupLabel>Account</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {accountItems.map((item) => {
                  const isActive = !!matchRoute({ to: item.to, fuzzy: false })
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
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <div className="flex flex-col gap-2 px-2 py-1 group-data-[collapsible=icon]:hidden">
                <div className="text-sm">
                  <p className="truncate font-medium">{session.user.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {session.user.email}
                  </p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full"
                  onClick={handleSignOut}
                >
                  Sign Out
                </Button>
              </div>
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
        </header>
        <main className="flex-1 overflow-auto p-4 lg:p-8">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
