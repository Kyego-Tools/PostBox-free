import { defineSchema, defineTable } from "convex/server"
import { authTables } from "@convex-dev/auth/server"
import { v } from "convex/values"

const platformValidator = v.union(
  v.literal("facebook"),
  v.literal("instagram"),
  v.literal("tiktok"),
  v.literal("twitter"),
  v.literal("threads")
)

export default defineSchema({
  // ─── Auth Tables (users, authAccounts, authSessions, authRefreshTokens) ───
  ...authTables,

  // ─── Social Accounts ───
  socialAccounts: defineTable({
    userId: v.id("users"),
    platform: platformValidator,
    platformAccountId: v.string(), // page ID, user ID, etc.
    platformUsername: v.string(),
    displayName: v.string(),
    profileImageUrl: v.optional(v.string()),
    accessTokenEncrypted: v.string(),
    refreshTokenEncrypted: v.optional(v.string()),
    tokenExpiresAt: v.optional(v.number()), // unix ms
    scopes: v.array(v.string()),
    accountType: v.optional(v.string()), // e.g. "BUSINESS", "CREATOR", "page"
    status: v.union(
      v.literal("active"),
      v.literal("expired"),
      v.literal("revoked"),
      v.literal("error")
    ),
    lastError: v.optional(v.string()),
    connectedAt: v.number(),
    // Facebook page → Instagram link
    parentAccountId: v.optional(v.id("socialAccounts")),
  })
    .index("by_user", ["userId"])
    .index("by_user_platform", ["userId", "platform"])
    .index("by_platform_accountId", ["platform", "platformAccountId"])
    .index("by_status", ["status"])
    .index("by_tokenExpiry", ["tokenExpiresAt"]),

  // ─── OAuth States (CSRF + PKCE) ───
  oauthStates: defineTable({
    userId: v.id("users"),
    platform: platformValidator,
    state: v.string(),
    codeVerifier: v.optional(v.string()), // PKCE (TikTok, Twitter)
    redirectUrl: v.string(), // where to send user after callback
    expiresAt: v.number(), // unix ms, 10-min TTL
    used: v.boolean(),
  })
    .index("by_state", ["state"])
    .index("by_expiresAt", ["expiresAt"]),

  // ─── Platform Credentials (user-provided API keys) ───
  platformCredentials: defineTable({
    userId: v.id("users"),
    platform: platformValidator,
    clientId: v.string(),
    clientSecretEncrypted: v.string(),
    additionalConfig: v.optional(v.any()),
  }).index("by_user_platform", ["userId", "platform"]),

  // ─── Scheduled Posts ───
  scheduledPosts: defineTable({
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
    scheduledAt: v.number(), // unix ms
    timezone: v.string(), // IANA timezone
    status: v.union(
      v.literal("draft"),
      v.literal("scheduled"),
      v.literal("publishing"),
      v.literal("published"),
      v.literal("failed"),
      v.literal("cancelled")
    ),
    scheduledFunctionId: v.optional(v.id("_scheduled_functions")),
    retryCount: v.number(),
    maxRetries: v.number(),
    platformOptions: v.optional(v.any()),
    // Drafts: groups multiple rows (one per account) from the same save
    draftGroupId: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_status", ["status"])
    .index("by_scheduledAt", ["scheduledAt"])
    .index("by_user_status", ["userId", "status"])
    .index("by_socialAccount", ["socialAccountId"]),

  // ─── Post History ───
  postHistory: defineTable({
    scheduledPostId: v.optional(v.id("scheduledPosts")), // optional for instant posts
    socialAccountId: v.optional(v.id("socialAccounts")),
    userId: v.id("users"),
    platform: platformValidator,
    status: v.union(
      v.literal("success"),
      v.literal("failed"),
      v.literal("partial")
    ),
    platformPostId: v.optional(v.string()),
    platformPostUrl: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    errorCode: v.optional(v.string()),
    publishedAt: v.number(),
    apiResponse: v.optional(v.any()),
  })
    .index("by_user", ["userId"])
    .index("by_scheduledPost", ["scheduledPostId"])
    .index("by_publishedAt", ["publishedAt"]),

  // ─── Media Files ───
  mediaFiles: defineTable({
    userId: v.id("users"),
    storageId: v.id("_storage"),
    fileName: v.string(),
    mimeType: v.string(),
    sizeBytes: v.number(),
    mediaType: v.union(v.literal("image"), v.literal("video")),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    durationSeconds: v.optional(v.number()),
    uploadedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_storageId", ["storageId"]),

  // ─── Analytics Cache ───
  analyticsCache: defineTable({
    socialAccountId: v.id("socialAccounts"),
    userId: v.id("users"),
    metricType: v.union(
      v.literal("page_insights"),
      v.literal("post_insights"),
      v.literal("follower_history"),
      v.literal("reach_history"),
      v.literal("interactions_history")
    ),
    period: v.string(), // "day", "week", "days_28"
    data: v.any(),
    fetchedAt: v.number(),
    expiresAt: v.number(), // cache TTL
  })
    .index("by_account_type", ["socialAccountId", "metricType"])
    .index("by_user", ["userId"])
    .index("by_expiresAt", ["expiresAt"]),
})
