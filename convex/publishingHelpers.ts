// Internal queries/mutations used by the publishing action

import { internalQuery, internalMutation } from "./_generated/server"
import { v } from "convex/values"

const platformValidator = v.union(
  v.literal("facebook"),
  v.literal("instagram"),
  v.literal("tiktok"),
  v.literal("twitter"),
  v.literal("threads")
)

// Get account data + media URLs needed for publishing
export const getPublishData = internalQuery({
  args: {
    userId: v.id("users"),
    accountId: v.id("socialAccounts"),
    mediaIds: v.optional(v.array(v.id("mediaFiles"))),
  },
  handler: async (ctx, args) => {
    const account = await ctx.db.get(args.accountId)
    if (!account || account.userId !== args.userId) return null

    // Resolve media URLs and mime types from Convex storage
    const mediaUrls: string[] = []
    const mediaMimeTypes: string[] = []
    if (args.mediaIds) {
      for (const mediaId of args.mediaIds) {
        const media = await ctx.db.get(mediaId)
        if (!media) continue
        const url = await ctx.storage.getUrl(media.storageId)
        if (url) {
          mediaUrls.push(url)
          mediaMimeTypes.push(media.mimeType)
        }
      }
    }

    console.log("[publishingHelpers] getPublishData", {
      platform: account.platform,
      mediaUrls,
      mediaMimeTypes,
    })
    return {
      platform: account.platform,
      platformAccountId: account.platformAccountId,
      accessTokenEncrypted: account.accessTokenEncrypted,
      mediaUrls,
      mediaMimeTypes,
    }
  },
})

// Record a publish result in postHistory
export const recordResult = internalMutation({
  args: {
    userId: v.id("users"),
    platform: platformValidator,
    scheduledPostId: v.optional(v.id("scheduledPosts")),
    result: v.object({
      success: v.boolean(),
      platformPostId: v.optional(v.string()),
      platformPostUrl: v.optional(v.string()),
      error: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    // For instant posts without a scheduledPost, create a minimal history entry
    await ctx.db.insert("postHistory", {
      scheduledPostId: args.scheduledPostId,
      userId: args.userId,
      platform: args.platform,
      status: args.result.success ? "success" : "failed",
      platformPostId: args.result.platformPostId,
      platformPostUrl: args.result.platformPostUrl,
      errorMessage: args.result.error,
      publishedAt: Date.now(),
    })
  },
})
