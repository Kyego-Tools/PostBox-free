/* eslint-disable react-hooks/purity */
"use client"

import { useState, useMemo, useCallback } from "react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"

export type SortOrder = "newest" | "oldest"
export type PlatformFilter =
  | "all"
  | "facebook"
  | "instagram"
  | "tiktok"
  | "twitter"
  | "threads"
export type TimeFilter = "all" | "today" | "week" | "month"
export type StatusFilter =
  | "all"
  | "scheduled"
  | "published"
  | "failed"
  | "cancelled"
  | "draft"

export function useAllPosts() {
  const rawPosts = useQuery(api.posts.listAll)
  const [sort, setSort] = useState<SortOrder>("newest")
  const [platform, setPlatform] = useState<PlatformFilter>("all")
  const [timeRange, setTimeRange] = useState<TimeFilter>("all")
  const [status, setStatus] = useState<StatusFilter>("all")

  const isLoading = rawPosts === undefined

  const posts = useMemo(() => {
    if (!rawPosts) return []

    let filtered = rawPosts

    // Platform filter
    if (platform !== "all") {
      filtered = filtered.filter((p) => p.platform === platform)
    }

    // Status filter
    if (status !== "all") {
      filtered = filtered.filter((p) => p.status === status)
    }

    // Time range filter
    if (timeRange !== "all") {
      const now = Date.now()
      const cutoff = {
        today: now - 24 * 60 * 60 * 1000,
        week: now - 7 * 24 * 60 * 60 * 1000,
        month: now - 30 * 24 * 60 * 60 * 1000,
      }[timeRange]
      filtered = filtered.filter((p) => p.scheduledAt >= cutoff)
    }

    // Sort
    return [...filtered].sort((a, b) =>
      sort === "newest"
        ? b.scheduledAt - a.scheduledAt
        : a.scheduledAt - b.scheduledAt
    )
  }, [rawPosts, sort, platform, timeRange, status])

  // Unique accounts for account filter
  const accounts = useMemo(() => {
    if (!rawPosts) return []
    const seen = new Map<string, { platform: string; displayName: string }>()
    for (const p of rawPosts) {
      if (p.account && !seen.has(p.account._id)) {
        seen.set(p.account._id, {
          platform: p.account.platform,
          displayName: p.account.displayName,
        })
      }
    }
    return Array.from(seen.entries()).map(([id, info]) => ({ id, ...info }))
  }, [rawPosts])

  return {
    posts,
    isLoading,
    totalCount: rawPosts?.length ?? 0,
    sort,
    setSort,
    platform,
    setPlatform,
    timeRange,
    setTimeRange,
    status,
    setStatus,
    accounts,
  }
}
