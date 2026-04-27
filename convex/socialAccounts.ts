import {
  internalMutation,
  internalQuery,
  query,
  mutation,
  action,
} from "./_generated/server"
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

// Internal: upsert a social account (called from OAuth callbacks)
export const upsert = internalMutation({
  args: {
    userId: v.id("users"),
    platform: platformValidator,
    platformAccountId: v.string(),
    platformUsername: v.string(),
    displayName: v.string(),
    profileImageUrl: v.optional(v.string()),
    accessTokenEncrypted: v.string(),
    refreshTokenEncrypted: v.optional(v.string()),
    tokenExpiresAt: v.optional(v.number()),
    scopes: v.array(v.string()),
    accountType: v.optional(v.string()),
    parentAccountId: v.optional(v.id("socialAccounts")),
  },
  handler: async (ctx, args) => {
    // Check if account already exists
    const existing = await ctx.db
      .query("socialAccounts")
      .withIndex("by_platform_accountId", (q) =>
        q
          .eq("platform", args.platform)
          .eq("platformAccountId", args.platformAccountId)
      )
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .unique()

    if (existing) {
      await ctx.db.patch(existing._id, {
        platformUsername: args.platformUsername,
        displayName: args.displayName,
        profileImageUrl: args.profileImageUrl,
        accessTokenEncrypted: args.accessTokenEncrypted,
        refreshTokenEncrypted: args.refreshTokenEncrypted,
        tokenExpiresAt: args.tokenExpiresAt,
        scopes: args.scopes,
        accountType: args.accountType,
        status: "active",
        lastError: undefined,
      })
      return existing._id
    }

    return ctx.db.insert("socialAccounts", {
      userId: args.userId,
      platform: args.platform,
      platformAccountId: args.platformAccountId,
      platformUsername: args.platformUsername,
      displayName: args.displayName,
      profileImageUrl: args.profileImageUrl,
      accessTokenEncrypted: args.accessTokenEncrypted,
      refreshTokenEncrypted: args.refreshTokenEncrypted,
      tokenExpiresAt: args.tokenExpiresAt,
      scopes: args.scopes,
      accountType: args.accountType,
      status: "active",
      connectedAt: Date.now(),
      parentAccountId: args.parentAccountId,
    })
  },
})

// Public: list connected accounts for the current user
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuth(ctx)
    return ctx.db
      .query("socialAccounts")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect()
  },
})

// Public: disconnect a social account
export const disconnect = mutation({
  args: { id: v.id("socialAccounts") },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx)
    const account = await ctx.db.get(args.id)
    if (!account || account.userId !== userId) {
      throw new Error("Account not found")
    }
    await ctx.db.delete(args.id)
  },
})

// Public: list accounts with token health info (strips encrypted tokens)
export const listWithHealth = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuth(ctx)
    const accounts = await ctx.db
      .query("socialAccounts")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect()

    const now = Date.now()
    const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000

    return accounts.map((a) => {
      let tokenHealth: "healthy" | "expiring_soon" | "expired" | "no_expiry" =
        "no_expiry"

      if (a.tokenExpiresAt) {
        if (a.tokenExpiresAt < now) {
          tokenHealth = "expired"
        } else if (a.tokenExpiresAt < now + SEVEN_DAYS) {
          tokenHealth = "expiring_soon"
        } else {
          tokenHealth = "healthy"
        }
      }

      // Strip sensitive fields
      const { accessTokenEncrypted, refreshTokenEncrypted, ...safe } = a
      return {
        ...safe,
        tokenHealth,
        daysUntilExpiry: a.tokenExpiresAt
          ? Math.max(
              0,
              Math.floor((a.tokenExpiresAt - now) / (1000 * 60 * 60 * 24))
            )
          : null,
      }
    })
  },
})

// Public: user-triggered token refresh
export const refreshToken = action({
  args: { id: v.id("socialAccounts") },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx)

    // Verify ownership via internal query
    const account = await ctx.runQuery(internal.socialAccounts.getById, {
      id: args.id,
    })

    if (!account || account.userId !== userId) {
      throw new Error("Account not found")
    }

    if (account.platform === "facebook") {
      throw new Error(
        "Facebook page tokens are long-lived. Reconnect the account if needed."
      )
    }

    await ctx.runAction(internal.tokenRefresh.refreshAccount, {
      accountId: account._id,
      platform: account.platform as
        | "instagram"
        | "tiktok"
        | "twitter"
        | "threads",
      accessTokenEncrypted: account.accessTokenEncrypted,
      refreshTokenEncrypted: account.refreshTokenEncrypted,
    })
  },
})

// Internal: get account by ID (used by actions that can't read DB directly)
export const getById = internalQuery({
  args: { id: v.id("socialAccounts") },
  handler: async (ctx, args) => {
    return ctx.db.get(args.id)
  },
})
