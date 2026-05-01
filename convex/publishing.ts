import { action, internalAction } from "./_generated/server"
import { internal } from "./_generated/api"
import { v } from "convex/values"
import { requireAuth } from "./lib/auth"
import { decrypt } from "./lib/encryption"
import { dispatchPublish } from "./lib/publishing/dispatch"
import type { ContentType } from "./lib/platforms/publish/types"

const platformValidator = v.union(
  v.literal("facebook"),
  v.literal("instagram"),
  v.literal("tiktok"),
  v.literal("twitter"),
  v.literal("threads")
)

// ─── Post Now (user-facing, multi-account fan-out) ───

export const postNow = action({
  args: {
    accountIds: v.array(v.id("socialAccounts")),
    contentType: v.string(),
    perAccountContentTypes: v.optional(v.record(v.string(), v.string())),
    caption: v.optional(v.string()),
    mediaIds: v.optional(v.array(v.id("mediaFiles"))),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx)
    const results: Array<{
      accountId: string
      platform: string
      success: boolean
      error?: string
      url?: string
    }> = []

    for (const accountId of args.accountIds) {
      // Get account info to determine platform
      const accountData = await ctx.runQuery(
        internal.publishingHelpers.getPublishData,
        {
          userId,
          accountId,
          mediaIds: args.mediaIds,
        }
      )
      if (!accountData) {
        results.push({
          accountId,
          platform: "unknown",
          success: false,
          error: "Account not found",
        })
        continue
      }

      // Per-account override (e.g. IG/FB "story", IG "reel"). Falls back to
      // the generic post type when no override is provided.
      const perAccountType = args.perAccountContentTypes?.[accountId]

      // Content type passed to the publisher (matches platforms/publish/types ContentType).
      // - "story" / "reel": use the override directly
      // - otherwise: use the generic post type ("image" / "video" / "text")
      const publishContentType =
        perAccountType === "story" || perAccountType === "reel"
          ? perAccountType
          : args.contentType

      // Content type stored on the scheduledPosts row (schema enum:
      // feed/story/reel/video/text). Mirrors the override when present.
      const schemaContentType =
        perAccountType === "story"
          ? "story"
          : perAccountType === "reel"
            ? "reel"
            : args.contentType === "image"
              ? "feed"
              : args.contentType

      // Create a scheduledPosts entry so instant posts appear in All Posts
      const postId = await ctx.runMutation(
        internal.scheduledPosts.createInstant,
        {
          userId,
          socialAccountId: accountId,
          platform: accountData.platform as
            | "facebook"
            | "instagram"
            | "tiktok"
            | "twitter"
            | "threads",
          contentType: schemaContentType as
            | "feed"
            | "story"
            | "reel"
            | "video"
            | "text",
          textContent: args.caption,
          mediaIds: args.mediaIds,
        }
      )

      const result = await ctx.runAction(
        internal.publishing.executeForAccount,
        {
          userId,
          accountId,
          contentType: publishContentType,
          caption: args.caption,
          mediaIds: args.mediaIds,
          scheduledPostId: postId,
        }
      )
      results.push(result)
    }

    return results
  },
})

// ─── Execute for a single account (internal, reused by scheduled posts) ───

export const executeForAccount = internalAction({
  args: {
    userId: v.id("users"),
    accountId: v.id("socialAccounts"),
    contentType: v.string(),
    caption: v.optional(v.string()),
    mediaIds: v.optional(v.array(v.id("mediaFiles"))),
    scheduledPostId: v.optional(v.id("scheduledPosts")),
  },
  handler: async (
    ctx,
    args
  ): Promise<{
    accountId: string
    platform: string
    success: boolean
    error?: string
    url?: string
  }> => {
    // 1. Get account + media URLs
    const data = await ctx.runQuery(internal.publishingHelpers.getPublishData, {
      userId: args.userId,
      accountId: args.accountId,
      mediaIds: args.mediaIds,
    })

    if (!data) throw new Error("Account not found or not owned by user")

    // 2. If scheduled, mark as publishing
    if (args.scheduledPostId) {
      await ctx.runMutation(internal.scheduledPosts.updateStatus, {
        id: args.scheduledPostId,
        status: "publishing",
      })
    }

    // 3. Decrypt token and publish
    const accessToken = await decrypt(data.accessTokenEncrypted)
    const result = await dispatchPublish(
      data.platform as
        | "facebook"
        | "instagram"
        | "tiktok"
        | "twitter"
        | "threads",
      {
        accessToken,
        platformAccountId: data.platformAccountId,
        contentType: args.contentType as ContentType,
        caption: args.caption,
        mediaUrls: data.mediaUrls,
        mediaMimeTypes: data.mediaMimeTypes,
      }
    )

    // 4. Record in post history
    await ctx.runMutation(internal.publishingHelpers.recordResult, {
      userId: args.userId,
      platform: data.platform,
      scheduledPostId: args.scheduledPostId,
      result: {
        success: result.success,
        platformPostId: result.platformPostId,
        platformPostUrl: result.platformPostUrl,
        error: result.error,
      },
    })

    // 5. If scheduled, update final status
    if (args.scheduledPostId) {
      await ctx.runMutation(internal.scheduledPosts.updateStatus, {
        id: args.scheduledPostId,
        status: result.success ? "published" : "failed",
      })
    }

    return {
      accountId: args.accountId,
      platform: data.platform,
      success: result.success,
      error: result.error,
      url: result.platformPostUrl,
    }
  },
})
