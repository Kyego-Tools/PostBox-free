"use client"

import { PageHeader } from "@/components/dashboard/shared/page-header/page-header"
import { ProBlur } from "@/components/dashboard/shared/pro-blur"
import GreetingHeader from "@/components/dashboard/overview/greeting-header"
import ActivityStats from "@/components/dashboard/overview/activity-stats"
import DummyAnalytics from "@/components/dashboard/overview/dummy-analytics"
import MiniCalendar from "@/components/dashboard/overview/mini-calendar"
import UpcomingPosts from "@/components/dashboard/overview/upcoming-posts"

export default function OverviewPage() {
  return (
    <div className="min-h-screen bg-muted/30">
      <PageHeader title="Dashboard" />
      <div className="mt-13 space-y-6 p-5">
        {/* Greeting */}
        <GreetingHeader />

        {/* Activity stat cards — always visible, no analytics needed */}
        <ActivityStats />

        {/* Main layout: 2 columns */}
        <div className="flex flex-col gap-6 lg:flex-row">
          {/* Left: analytics content — blurred, dummy data for free tier */}
          <ProBlur className="min-w-0 flex-1">
            <DummyAnalytics />
          </ProBlur>

          {/* Right: free widgets */}
          <div className="w-full shrink-0 space-y-5 lg:w-72 xl:w-80">
            <MiniCalendar />
            <UpcomingPosts />
          </div>
        </div>
      </div>
    </div>
  )
}
