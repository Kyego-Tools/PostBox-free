"use client"

import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { useConvexAuth, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { ThemeToggle } from "@/components/ui/theme/theme-toggle"
import { HeaderUserNav } from "./header-user-nav"

type PageHeaderProps = {
  title: string
}

export function PageHeader({ title }: PageHeaderProps) {
  const { state } = useSidebar()
  const today = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
  const { isAuthenticated } = useConvexAuth()

  const currentUser = useQuery(api.users.getMe, isAuthenticated ? {} : "skip")

  return (
    <header
      className={`fixed top-0 right-0 left-0 flex ${state === "collapsed" ? "md:left-[var(--sidebar-width-icon)]" : "md:left-[var(--sidebar-width)]"} z-49 h-13 items-center justify-between border-b bg-background px-6 transition-[left] duration-200 ease-linear`}
    >
      <div className="flex items-center gap-3">
        <SidebarTrigger className="-ml-2" />
        <Separator orientation="vertical" />
        <h1 className="text-base font-medium">{title}</h1>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground">{today}</span>
        <Separator orientation="vertical" />
        <ThemeToggle />
        {currentUser && <HeaderUserNav user={currentUser} />}
      </div>
    </header>
  )
}
