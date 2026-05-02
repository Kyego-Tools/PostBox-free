import { query } from "./_generated/server"
import { v } from "convex/values"
import { requireAuth } from "./lib/auth"
import type { PostInsight } from "./lib/platforms/analytics/types"

// ─── All posts: merges scheduledPosts (your app) + post_insights (platform API) ───
// Deduplicates using platformPostId from postHistory to link app posts to platform posts.
// Platform-only posts (posted natively, before joining, etc.) appear as source: "platform".

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuth(ctx)

    // 1. Get all scheduledPosts
    const scheduledPosts = await ctx.db
      .query("scheduledPosts")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect()

    // 2. Get postHistory entries to link scheduledPosts → platform post IDs
    const historyEntries = await ctx.db
      .query("postHistory")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect()

    // Build lookup: scheduledPostId → postHistory entry
    const historyByScheduledId = new Map<
      string,
      (typeof historyEntries)[number]
    >()
    // Build set of platform post IDs that came from our app
    const appPlatformPostIds = new Set<string>()
    for (const h of historyEntries) {
      if (h.scheduledPostId) {
        historyByScheduledId.set(h.scheduledPostId, h)
      }
      if (h.platformPostId) {
        appPlatformPostIds.add(h.platformPostId)
      }
    }

    // 3. Enrich scheduledPosts with account info + media URLs + history data
    const appPosts = await Promise.all(
      scheduledPosts.map(async (post) => {
        const account = await ctx.db.get(post.socialAccountId)
        const history = historyByScheduledId.get(post._id)

        let mediaUrls: string[] = []
        if (post.mediaIds?.length) {
          const files = await Promise.all(
            post.mediaIds.map((id) => ctx.db.get(id))
          )
          mediaUrls = await Promise.all(
            files.filter(Boolean).map(async (f) => {
              const url = await ctx.storage.getUrl(f!.storageId)
              return url || ""
            })
          )
          mediaUrls = mediaUrls.filter(Boolean)
        }

        return {
          _id: post._id,
          source: "app" as const,
          platform: post.platform,
          contentType: post.contentType,
          textContent: post.textContent,
          scheduledAt: post.scheduledAt,
          publishedAt: history?.publishedAt,
          status: post.status,
          mediaUrls,
          platformPostId: history?.platformPostId,
          platformPostUrl: history?.platformPostUrl,
          account: account
            ? {
                _id: account._id,
                platform: account.platform,
                displayName: account.displayName,
                profileImageUrl: account.profileImageUrl,
              }
            : null,
        }
      })
    )

    // 4. Get platform posts from analytics cache (post_insights)
    const accounts = await ctx.db
      .query("socialAccounts")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect()

    const platformPosts: Array<{
      _id: string
      source: "platform"
      platform: string
      contentType: string
      textContent?: string
      scheduledAt: number
      publishedAt: number
      status: string
      mediaUrls: string[]
      platformPostId?: string
      platformPostUrl?: string
      engagement: {
        views: number
        reach: number
        likes: number
        comments: number
        shares: number
        engagementRate: number
      }
      account: {
        _id: string
        platform: string
        displayName: string
        profileImageUrl?: string
      } | null
    }> = []

    const now = Date.now()

    for (const account of accounts) {
      const cacheEntry = await ctx.db
        .query("analyticsCache")
        .withIndex("by_account_type", (q) =>
          q.eq("socialAccountId", account._id).eq("metricType", "post_insights")
        )
        .first()

      if (!cacheEntry || cacheEntry.expiresAt < now) continue

      const insights = cacheEntry.data as PostInsight[]
      for (const post of insights) {
        // Skip if this platform post was already created through our app
        if (appPlatformPostIds.has(post.postId)) continue
        // TikTok: all posts are tracked via the scheduler (inbox flow),
        // so never show platform-sourced TikTok posts to avoid duplicates.
        if (account.platform === "tiktok") continue

        const publishedAt = new Date(post.createdTime).getTime()

        platformPosts.push({
          _id: `platform_${post.postId}`,
          source: "platform",
          platform: account.platform,
          contentType: "feed",
          textContent: post.message,
          scheduledAt: publishedAt,
          publishedAt,
          status: "published",
          mediaUrls: post.fullPicture ? [post.fullPicture] : [],
          platformPostId: post.postId,
          platformPostUrl: post.permalinkUrl,
          engagement: {
            views: post.views,
            reach: post.reach,
            likes: post.reactions,
            comments: post.comments,
            shares: post.shares,
            engagementRate: post.engagementRate,
          },
          account: {
            _id: account._id,
            platform: account.platform,
            displayName: account.displayName,
            profileImageUrl: account.profileImageUrl,
          },
        })
      }
    }

    // 5. Merge and sort by date (newest first)
    const allPosts = [...appPosts, ...platformPosts].sort(
      (a, b) =>
        (b.publishedAt ?? b.scheduledAt) - (a.publishedAt ?? a.scheduledAt)
    )

    return allPosts
  },
})

// ─── Scheduled posts only (future, status = "scheduled") ───

export const listScheduled = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuth(ctx)

    const posts = await ctx.db
      .query("scheduledPosts")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", userId).eq("status", "scheduled")
      )
      .collect()

    // Only future posts, sorted by soonest first
    const now = Date.now()
    const upcoming = posts
      .filter((p) => p.scheduledAt > now)
      .sort((a, b) => a.scheduledAt - b.scheduledAt)

    // Resolve account info + media URLs
    const enriched = await Promise.all(
      upcoming.map(async (post) => {
        const account = await ctx.db.get(post.socialAccountId)

        let mediaUrls: string[] = []
        if (post.mediaIds?.length) {
          const files = await Promise.all(
            post.mediaIds.map((id) => ctx.db.get(id))
          )
          mediaUrls = await Promise.all(
            files.filter(Boolean).map(async (f) => {
              const url = await ctx.storage.getUrl(f!.storageId)
              return url || ""
            })
          )
          mediaUrls = mediaUrls.filter(Boolean)
        }

        return {
          _id: post._id,
          platform: post.platform,
          contentType: post.contentType,
          textContent: post.textContent,
          scheduledAt: post.scheduledAt,
          timezone: post.timezone,
          status: post.status,
          mediaUrls,
          account: account
            ? {
                _id: account._id,
                platform: account.platform,
                displayName: account.displayName,
                profileImageUrl: account.profileImageUrl,
              }
            : null,
        }
      })
    )

    return enriched
  },
})

// ─── Drafts: grouped by draftGroupId ───

export const listDrafts = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuth(ctx)

    const drafts = await ctx.db
      .query("scheduledPosts")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", userId).eq("status", "draft")
      )
      .collect()

    // Group by draftGroupId
    const groups = new Map<
      string,
      {
        draftGroupId: string
        contentType: string
        textContent?: string
        scheduledAt: number
        timezone: string
        mediaIds?: string[]
        createdAt: number
        accounts: {
          _id: string
          platform: string
          displayName: string
          profileImageUrl?: string
        }[]
        mediaUrls: string[]
      }
    >()

    for (const draft of drafts) {
      const groupId = draft.draftGroupId ?? draft._id
      const existing = groups.get(groupId)

      const account = await ctx.db.get(draft.socialAccountId)
      const acct = account
        ? {
            _id: account._id,
            platform: account.platform,
            displayName: account.displayName,
            profileImageUrl: account.profileImageUrl,
          }
        : null

      if (existing) {
        if (acct) existing.accounts.push(acct)
      } else {
        // Resolve media URLs once per group
        let mediaUrls: string[] = []
        if (draft.mediaIds?.length) {
          const files = await Promise.all(
            draft.mediaIds.map((id) => ctx.db.get(id))
          )
          mediaUrls = await Promise.all(
            files.filter(Boolean).map(async (f) => {
              const url = await ctx.storage.getUrl(f!.storageId)
              return url || ""
            })
          )
          mediaUrls = mediaUrls.filter(Boolean)
        }

        groups.set(groupId, {
          draftGroupId: groupId,
          contentType: draft.contentType,
          textContent: draft.textContent,
          scheduledAt: draft.scheduledAt,
          timezone: draft.timezone,
          createdAt: draft._creationTime,
          accounts: acct ? [acct] : [],
          mediaUrls,
        })
      }
    }

    // Sort newest drafts first
    return [...groups.values()].sort((a, b) => b.createdAt - a.createdAt)
  },
})

// ─── Get a single draft group by draftGroupId (for loading into composer) ───

export const getDraftGroup = query({
  args: { draftGroupId: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx)

    const drafts = await ctx.db
      .query("scheduledPosts")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", userId).eq("status", "draft")
      )
      .collect()

    const groupDrafts = drafts.filter(
      (d) => d.draftGroupId === args.draftGroupId
    )
    if (groupDrafts.length === 0) return null

    const first = groupDrafts[0]

    // Resolve account IDs
    const accountIds = groupDrafts.map((d) => d.socialAccountId)

    // Resolve media URLs
    let mediaUrls: string[] = []
    if (first.mediaIds?.length) {
      const files = await Promise.all(
        first.mediaIds.map((id) => ctx.db.get(id))
      )
      mediaUrls = await Promise.all(
        files.filter(Boolean).map(async (f) => {
          const url = await ctx.storage.getUrl(f!.storageId)
          return url || ""
        })
      )
      mediaUrls = mediaUrls.filter(Boolean)
    }

    return {
      draftGroupId: args.draftGroupId,
      accountIds,
      contentType: first.contentType,
      textContent: first.textContent,
      scheduledAt: first.scheduledAt,
      timezone: first.timezone,
      mediaIds: first.mediaIds,
      mediaUrls,
    }
  },
})

// ─── Posting streak: consecutive days with at least 1 published post ───

export const getPostingStreak = query({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx)

    const toKey = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`

    // ── 1. App posts from postHistory ──
    const history = await ctx.db.query("postHistory").collect()
    const published = history.filter(
      (h) => h.status === "success" && h.publishedAt
    )

    const postingDays = new Set<string>()
    let totalPosts = 0

    // Track app platform post IDs so we don't double-count
    const appPlatformPostIds = new Set<string>()
    for (const h of published) {
      postingDays.add(toKey(new Date(h.publishedAt!)))
      totalPosts++
      if (h.platformPostId) appPlatformPostIds.add(h.platformPostId)
    }

    // ── 2. Platform-native posts from analyticsCache ──
    const accounts = await ctx.db.query("socialAccounts").collect()
    const now = Date.now()

    for (const account of accounts) {
      const cacheEntry = await ctx.db
        .query("analyticsCache")
        .withIndex("by_account_type", (q) =>
          q.eq("socialAccountId", account._id).eq("metricType", "post_insights")
        )
        .first()

      if (!cacheEntry || cacheEntry.expiresAt < now) continue

      const insights = cacheEntry.data as PostInsight[]
      for (const post of insights) {
        if (appPlatformPostIds.has(post.postId)) continue
        const publishedAt = new Date(post.createdTime)
        postingDays.add(toKey(publishedAt))
        totalPosts++
      }
    }

    // ── 3. Current streak (consecutive days ending today or yesterday) ──
    const today = new Date()
    let currentStreak = 0
    const checkDate = new Date(today)

    if (!postingDays.has(toKey(checkDate))) {
      checkDate.setDate(checkDate.getDate() - 1)
    }

    if (postingDays.has(toKey(checkDate))) {
      while (postingDays.has(toKey(checkDate))) {
        currentStreak++
        checkDate.setDate(checkDate.getDate() - 1)
      }
    }

    // ── 4. Best streak ever ──
    const sortedDays = Array.from(postingDays).sort()
    let bestStreak = 0
    let runStreak = 0
    let prevDate: Date | null = null

    for (const dayStr of sortedDays) {
      const [y, m, d] = dayStr.split("-").map(Number)
      const date = new Date(y, m - 1, d)

      if (prevDate) {
        const diff =
          (date.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
        runStreak = Math.round(diff) === 1 ? runStreak + 1 : 1
      } else {
        runStreak = 1
      }

      bestStreak = Math.max(bestStreak, runStreak)
      prevDate = date
    }

    // ── 5. Last 7 days ──
    const last7Days: { date: string; dayLabel: string; posted: boolean }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      last7Days.push({
        date: toKey(d),
        dayLabel: d.toLocaleDateString("en-US", { weekday: "short" }).charAt(0),
        posted: postingDays.has(toKey(d)),
      })
    }

    return { currentStreak, bestStreak, last7Days, totalPosts }
  },
})

// ─── Calendar dots: timestamps of all posting activity (scheduled + published) ───
// Lean query — returns only timestamps, no media/account enrichment.

export const getCalendarDots = query({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx)

    const timestamps: number[] = []

    // Future scheduled posts (status = "scheduled" or "pendingApproval")
    const scheduledPosts = await ctx.db.query("scheduledPosts").collect()
    for (const post of scheduledPosts) {
      if (post.status === "scheduled") {
        timestamps.push(post.scheduledAt)
      }
    }

    // Past published posts from postHistory
    const history = await ctx.db.query("postHistory").collect()
    for (const h of history) {
      if (h.status === "success" && h.publishedAt) {
        timestamps.push(h.publishedAt)
      }
    }

    return timestamps
  },
})
