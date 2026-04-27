import { mutation, query, internalMutation } from "./_generated/server"
import { internal } from "./_generated/api"
import { v } from "convex/values"
import { requireAuth } from "./lib/auth"

const platformValidator = v.union(
  v.literal("facebook"),
  v.literal("instagram"),
  v.literal("tiktok"),
  v.literal("twitter"),
  v.literal("threads")
)

// ─── Schedule a post for future publishing ───

export const create = mutation({
  args: {
    socialAccountId: v.id("socialAccounts"),
    platform: platformValidator,
    contentType: v.union(
      v.literal("feed"),
      v.literal("story"),
      v.literal("reel"),
      v.literal("video"),
      v.literal("text")
    ),
    textContent: v.optional(v.string()),
    mediaIds: v.optional(v.array(v.id("mediaFiles"))),
    scheduledAt: v.number(), // unix ms
    timezone: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx)

    // Verify account ownership
    const account = await ctx.db.get(args.socialAccountId)
    if (!account || account.userId !== userId) {
      throw new Error("Account not found")
    }

    // Create the scheduled post
    const postId = await ctx.db.insert("scheduledPosts", {
      userId,
      socialAccountId: args.socialAccountId,
      platform: args.platform,
      contentType: args.contentType,
      textContent: args.textContent,
      mediaIds: args.mediaIds,
      scheduledAt: args.scheduledAt,
      timezone: args.timezone,
      status: "scheduled",
      retryCount: 0,
      maxRetries: 3,
    })

    // Map schema content types to publish content types
    // Schema: feed/story/reel/video/text → Publisher: image/story/reel/video/text
    const publishContentType =
      args.contentType === "feed" && args.mediaIds?.length
        ? "image"
        : args.contentType === "feed"
          ? "text"
          : args.contentType

    // Schedule the execution at the specified time
    const scheduledFnId = await ctx.scheduler.runAt(
      args.scheduledAt,
      internal.publishing.executeForAccount,
      {
        userId,
        accountId: args.socialAccountId,
        contentType: publishContentType,
        caption: args.textContent,
        mediaIds: args.mediaIds,
        scheduledPostId: postId,
      }
    )

    // Store the scheduled function ID so we can cancel it
    await ctx.db.patch(postId, { scheduledFunctionId: scheduledFnId })

    return postId
  },
})

// ─── Cancel a scheduled post ───

export const cancel = mutation({
  args: { id: v.id("scheduledPosts") },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx)
    const post = await ctx.db.get(args.id)

    if (!post || post.userId !== userId) throw new Error("Post not found")
    if (post.status !== "scheduled")
      throw new Error("Only scheduled posts can be cancelled")

    // Cancel the scheduled function
    if (post.scheduledFunctionId) {
      await ctx.scheduler.cancel(post.scheduledFunctionId)
    }

    await ctx.db.patch(args.id, { status: "cancelled" })
  },
})

// ─── List scheduled posts ───

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuth(ctx)
    return ctx.db
      .query("scheduledPosts")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect()
  },
})

// ─── Save draft (one row per selected account, grouped by draftGroupId) ───

export const saveDraft = mutation({
  args: {
    accountIds: v.array(v.id("socialAccounts")),
    contentType: v.union(
      v.literal("feed"),
      v.literal("story"),
      v.literal("reel"),
      v.literal("video"),
      v.literal("text")
    ),
    textContent: v.optional(v.string()),
    mediaIds: v.optional(v.array(v.id("mediaFiles"))),
    scheduledAt: v.optional(v.number()), // undefined = no schedule set
    timezone: v.string(),
    // If updating an existing draft group, pass the groupId to replace it
    existingDraftGroupId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx)
    const draftGroupId = args.existingDraftGroupId ?? crypto.randomUUID()

    // If updating, delete old draft rows in this group
    if (args.existingDraftGroupId) {
      const oldDrafts = await ctx.db
        .query("scheduledPosts")
        .withIndex("by_user_status", (q) =>
          q.eq("userId", userId).eq("status", "draft")
        )
        .collect()
      for (const d of oldDrafts) {
        if (d.draftGroupId === args.existingDraftGroupId) {
          await ctx.db.delete(d._id)
        }
      }
    }

    // Insert one row per account
    for (const accountId of args.accountIds) {
      const account = await ctx.db.get(accountId)
      if (!account || account.userId !== userId) continue

      await ctx.db.insert("scheduledPosts", {
        userId,
        socialAccountId: accountId,
        platform: account.platform,
        contentType: args.contentType,
        textContent: args.textContent,
        mediaIds: args.mediaIds,
        scheduledAt: args.scheduledAt ?? 0,
        timezone: args.timezone,
        status: "draft",
        retryCount: 0,
        maxRetries: 0,
        draftGroupId,
      })
    }

    return draftGroupId
  },
})

// ─── Delete a draft group ───

export const deleteDraft = mutation({
  args: { draftGroupId: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx)
    const drafts = await ctx.db
      .query("scheduledPosts")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", userId).eq("status", "draft")
      )
      .collect()

    for (const d of drafts) {
      if (d.draftGroupId === args.draftGroupId) {
        await ctx.db.delete(d._id)
      }
    }
  },
})

// ─── List posts currently publishing or recently completed (for toast tracking) ───

export const listRecentPublishing = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuth(ctx)
    const since = Date.now() - 2 * 60 * 60 * 1000 // last 2 hours
    const posts = await ctx.db
      .query("scheduledPosts")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect()
    return posts.filter(
      (p) =>
        p.scheduledAt >= since &&
        (p.status === "publishing" ||
          p.status === "published" ||
          p.status === "failed")
    )
  },
})

// ─── Internal: create entry for instant posts (Option B) ───
// Even instant posts get a scheduledPosts row so all posts live in one table.

export const createInstant = internalMutation({
  args: {
    userId: v.id("users"),
    socialAccountId: v.id("socialAccounts"),
    platform: platformValidator,
    contentType: v.union(
      v.literal("feed"),
      v.literal("story"),
      v.literal("reel"),
      v.literal("video"),
      v.literal("text")
    ),
    textContent: v.optional(v.string()),
    mediaIds: v.optional(v.array(v.id("mediaFiles"))),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("scheduledPosts", {
      userId: args.userId,
      socialAccountId: args.socialAccountId,
      platform: args.platform,
      contentType: args.contentType,
      textContent: args.textContent,
      mediaIds: args.mediaIds,
      scheduledAt: Date.now(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      status: "publishing",
      retryCount: 0,
      maxRetries: 0,
    })
  },
})

// ─── Internal: update status (used by publishing action) ───

export const updateStatus = internalMutation({
  args: {
    id: v.id("scheduledPosts"),
    status: v.union(
      v.literal("publishing"),
      v.literal("published"),
      v.literal("failed"),
      v.literal("cancelled")
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { status: args.status })
  },
})
