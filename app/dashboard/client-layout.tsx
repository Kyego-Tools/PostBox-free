"use client"

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import NextTopLoader from "nextjs-toploader"
import { useRouter } from "next/navigation"
import React, { useEffect } from "react"
import { useConvexAuth, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { AppSidebar } from "@/components/dashboard/shared/sidebar/app-sidebar"

interface ClientLayoutProps {
  children: React.ReactNode
}

function AuthLoading() {
  return (
    <div className="flex h-screen w-full items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  )
}

export function ClientLayout({ children }: ClientLayoutProps) {
  const router = useRouter()
  const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth()
  // Only run the query once auth is confirmed — skip while loading/unauthenticated
  const currentUser = useQuery(api.users.getMe, isAuthenticated ? {} : "skip")

  const user = useConvexAuth()
  console.log("Current user in ClientLayout:", user) // Debug log to check current user
  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      router.replace("/sign-in")
    }
  }, [isAuthLoading, isAuthenticated, router])

  // Debug — check browser console
  console.log(
    "[dashboard] isAuthLoading:",
    isAuthLoading,
    "isAuthenticated:",
    isAuthenticated,
    "currentUser:",
    currentUser
  )

  // Still loading auth, or not authenticated, or query hasn't resolved yet
  if (isAuthLoading || !isAuthenticated || currentUser === undefined) {
    return <AuthLoading />
  }

  return (
    <>
      <NextTopLoader color="#1e9df1" showSpinner={false} />
      <SidebarProvider
        style={
          {
            "--sidebar-width": "220px",
            "--sidebar-width-icon": "3rem",
            "--top-header-height": "52px",
          } as React.CSSProperties
        }
      >
        <AppSidebar />
        <SidebarInset>{children}</SidebarInset>
      </SidebarProvider>
    </>
  )
}
