"use client"

import { useMemo } from "react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import Link from "next/link"
import { ChevronRight, Flame } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

function StatCard({
  label,
  value,
  sub,
  href,
  accent,
}: {
  label: string
  value: number | undefined
  sub: string
  href: string
  accent?: string
}) {
  return (
    <Link href={href}>
      <Card className="transition-shadow hover:shadow-md">
        <CardContent className="px-5">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          {value === undefined ? (
            <Skeleton className="h-9 w-14" />
          ) : (
            <p
              className={`mt-2 text-3xl font-bold tracking-tight tabular-nums ${accent ?? ""}`}
            >
              {value}
            </p>
          )}
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{sub}</span>
            <ChevronRight className="size-4 text-muted-foreground/40" />
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

export default function ActivityStats() {
  const scheduled = useQuery(api.posts.listScheduled)
  const drafts = useQuery(api.posts.listDrafts)
  const calendarDots = useQuery(api.posts.getCalendarDots)
  const streak = useQuery(api.posts.getPostingStreak)

  const publishedThisWeek = useMemo(() => {
    if (!calendarDots) return undefined
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    return calendarDots.filter((ts) => ts >= weekAgo).length
  }, [calendarDots])

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatCard
        label="Scheduled Posts"
        value={scheduled?.length}
        sub="upcoming"
        href="/dashboard/posts/scheduled"
      />
      <StatCard
        label="Published This Week"
        value={publishedThisWeek}
        sub="last 7 days"
        href="/dashboard/posts/all"
      />
      <StatCard
        label="Drafts"
        value={drafts?.length}
        sub="in progress"
        href="/dashboard/posts/drafts"
      />
      <Link href="/dashboard/posts/all">
        <Card className="transition-shadow hover:shadow-md">
          <CardContent className="px-5">
            <p className="text-sm font-medium text-muted-foreground">
              Posting Streak
            </p>
            {streak === undefined ? (
              <Skeleton className="my-2 h-9 w-14" />
            ) : (
              <div className="mt-2 flex items-end gap-2">
                <p className="text-3xl font-bold tracking-tight text-orange-500 tabular-nums">
                  {streak.currentStreak}
                </p>
                <Flame className="mb-1 size-5 text-orange-400" />
              </div>
            )}
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                best: {streak?.bestStreak ?? "—"} days
              </span>
              <ChevronRight className="size-4 text-muted-foreground/40" />
            </div>
          </CardContent>
        </Card>
      </Link>
    </div>
  )
}
