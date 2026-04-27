"use client"

import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { useEffect, useRef } from "react"
import { toast } from "sonner"
import {
  PLATFORM_LABEL,
  BATCH_TOAST_ID,
  PostingToast,
} from "@/components/dashboard/shared/posting-toast"

export { PostingToast, BATCH_TOAST_ID }

export function usePublishingToasts() {
  const posts = useQuery(api.scheduledPosts.listRecentPublishing)
  const prevStatuses = useRef<Map<string, string>>(new Map())
  const prevPlatformsKey = useRef<string>("")

  useEffect(() => {
    if (!posts) return

    const publishing = posts.filter((p) => p.status === "publishing")

    // Update batch toast only when the set of in-flight platforms changes
    if (publishing.length > 0) {
      const platforms = [...new Set(publishing.map((p) => p.platform))]
      const key = platforms.join(",")
      if (key !== prevPlatformsKey.current) {
        prevPlatformsKey.current = key
        toast.loading(<PostingToast platforms={platforms} />, {
          id: BATCH_TOAST_ID,
          duration: Infinity,
        })
      }
    } else if (prevPlatformsKey.current !== "") {
      prevPlatformsKey.current = ""
      toast.dismiss(BATCH_TOAST_ID)
    }

    // Individual success / error per completion
    for (const post of posts) {
      const prev = prevStatuses.current.get(post._id)
      const label = PLATFORM_LABEL[post.platform] ?? post.platform

      if (prev === "publishing" && post.status === "published") {
        toast.success(`Posted to ${label}`, { duration: 5000 })
      } else if (prev === "publishing" && post.status === "failed") {
        toast.error(`Failed to post to ${label}`, { duration: 8000 })
      }

      prevStatuses.current.set(post._id, post.status)
    }
  }, [posts])
}
