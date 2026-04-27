"use client"

import * as React from "react"
import {
  IconLayoutDashboard,
  IconActivity,
  IconPlugConnected,
  IconCalendar,
  IconCalendarClock,
  IconChartBar,
  IconFilePlus,
  IconFilePencil,
} from "@tabler/icons-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuBadge,
  useSidebar,
} from "@/components/ui/sidebar"
import { usePathname } from "next/navigation"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"
import { type Icon } from "@tabler/icons-react"
import Image from "next/image"

type NavItem = {
  title: string
  url: string
  icon: Icon
  badge?: string
}

type NavSection = {
  label: string
  items: NavItem[]
}

function getNavSections(): NavSection[] {
  return [
    {
      label: "Overview",
      items: [
        {
          title: "Dashboard",
          url: "/dashboard/overview",
          icon: IconLayoutDashboard,
        },
        {
          title: "Create Post",
          url: "/dashboard/new-post",
          icon: IconFilePlus,
        },
      ],
    },
    {
      label: "Posts",
      items: [
        {
          title: "Calendar",
          url: "/dashboard/posts/calendar",
          icon: IconCalendar,
        },
        { title: "All posts", url: "/dashboard/posts/all", icon: IconActivity },
        {
          title: "Scheduled",
          url: "/dashboard/posts/scheduled",
          icon: IconCalendarClock,
        },
        {
          title: "Drafts",
          url: "/dashboard/posts/drafts",
          icon: IconFilePencil,
        },
      ],
    },
    {
      label: "Settings",
      items: [
        {
          title: "Connections",
          url: "/dashboard/settings/connections",
          icon: IconPlugConnected,
        },
      ],
    },
  ]
}

function NavSkeleton() {
  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu>
          {[1, 2, 3].map((i) => (
            <SidebarMenuItem key={i}>
              <SidebarMenuButton className="pointer-events-none">
                <Skeleton className="size-4 rounded" />
                <Skeleton className="h-4 w-24" />
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

function NavSectionComponent({
  section,
  pathname,
}: {
  section: NavSection
  pathname: string
}) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel className="text-xs font-medium tracking-wider text-muted-foreground/70">
        {section.label}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {section.items.map((item) => {
            const isActive =
              item.url === "/admin"
                ? pathname === "/admin"
                : pathname === item.url || pathname.startsWith(item.url + "/")

            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild
                  tooltip={item.title}
                  isActive={isActive}
                >
                  <Link href={item.url}>
                    <item.icon className="size-4" />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
                {item.badge && (
                  <SidebarMenuBadge className="bg-destructive/10 text-[10px] text-destructive">
                    {item.badge}
                  </SidebarMenuBadge>
                )}
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { isMobile, setOpenMobile } = useSidebar()
  const pathname = usePathname()

  React.useEffect(() => {
    if (isMobile) setOpenMobile(false)
  }, [pathname, isMobile, setOpenMobile])

  const navSections = getNavSections()

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="px-4 py-3">
        <Link
          href="/dashboard/overview"
          className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center"
        >
          <span className="flex size-7 shrink-0 items-center justify-center rounded-md text-xs font-medium">
            <Image src="/logo.png" alt="PostBox" width={28} height={28} />
          </span>
          <span className="text-base font-medium group-data-[collapsible=icon]:hidden">
            PostBox
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        {navSections.map((section) => (
          <NavSectionComponent
            key={section.label}
            section={section}
            pathname={pathname}
          />
        ))}
      </SidebarContent>
      <SidebarFooter />
    </Sidebar>
  )
}
