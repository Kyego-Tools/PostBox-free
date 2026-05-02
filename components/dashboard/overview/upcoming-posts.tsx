"use client"

import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Clock, CalendarClock, VideoIcon } from "lucide-react"
import { PlatformIcon } from "@/components/dashboard/analytics/platform-icon"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"

export default function UpcomingPosts() {
  const scheduled = useQuery(api.posts.listScheduled)

  if (scheduled === undefined) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <CalendarClock className="size-4 text-primary" />
            Upcoming Posts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    )
  }

  const upcoming = scheduled.slice(0, 4)

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <CalendarClock className="size-4 text-primary" />
          Upcoming Posts
        </CardTitle>
        {scheduled.length > 4 && (
          <Link
            href="/dashboard/posts/scheduled"
            className="text-[11px] font-medium text-primary hover:underline"
          >
            View all
          </Link>
        )}
      </CardHeader>
      <CardContent>
        {upcoming.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-4 text-center">
            <Clock className="size-8 text-muted-foreground/30" />
            <p className="text-xs text-muted-foreground">
              No upcoming posts scheduled
            </p>
            <Link
              href="/dashboard/new-post"
              className="text-xs font-medium text-primary hover:underline"
            >
              Create a post
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {upcoming.map((post) => {
              const date = new Date(post.scheduledAt)
              const dateStr = date.toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              })
              const timeStr = date.toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
              })

              return (
                <div
                  key={post._id}
                  className="flex items-start gap-3 rounded-lg border p-2.5"
                >
                  {/* Thumbnail or platform icon */}
                  <div className="relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
                    {post.mediaUrls?.[0] ? (
                      post.contentType === "video" ||
                      post.contentType === "reel" ? (
                        <>
                          <video
                            src={post.mediaUrls[0]}
                            className="size-9 object-cover"
                            preload="metadata"
                            muted
                            playsInline
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                            <VideoIcon className="size-3 text-white drop-shadow" />
                          </div>
                        </>
                      ) : (
                        <img
                          src={post.mediaUrls[0]}
                          alt=""
                          className="size-9 rounded-md object-cover"
                        />
                      )
                    ) : (
                      <PlatformIcon
                        platform={post.platform}
                        className="size-4"
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium">
                      {post.textContent || "Untitled post"}
                    </p>
                    <div className="mt-0.5 flex items-center gap-2 text-[10px] text-muted-foreground">
                      <PlatformIcon
                        platform={post.platform}
                        className="size-3"
                      />
                      <span>
                        {dateStr} &middot; {timeStr}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
