import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { encrypt, decrypt } from "./lib/encryption";
import { refreshInstagramToken } from "./lib/platforms/instagram";
import { refreshThreadsToken } from "./lib/platforms/threads";
import { refreshTikTokToken } from "./lib/platforms/tiktok";
import { refreshTwitterToken } from "./lib/platforms/twitter";

// ─── Constants ───

// Per-platform buffer used by the periodic cron. Short-lived tokens (X/TikTok,
// ~2 h) need a tight buffer so the cron actually catches them; long-lived
// tokens (IG/Threads, 60 d) use a wide window so we rotate well ahead of time.
const PLATFORM_REFRESH_BUFFER_MS: Record<string, number> = {
  twitter: 15 * 60 * 1000, // 15 min
  tiktok: 15 * 60 * 1000, // 15 min
  instagram: 7 * 24 * 60 * 60 * 1000, // 7 days
  threads: 7 * 24 * 60 * 60 * 1000, // 7 days
};

// Tighter buffer for inline refresh-before-publish. We're about to use the
// token immediately, so anything expiring in the next 5 min gets rotated.
const PUBLISH_REFRESH_BUFFER_MS = 5 * 60 * 1000;

// ─── Internal mutation: update tokens after refresh ───

export const updateTokens = internalMutation({
  args: {
    accountId: v.id("socialAccounts"),
    accessTokenEncrypted: v.string(),
    refreshTokenEncrypted: v.optional(v.string()),
    tokenExpiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.accountId, {
      accessTokenEncrypted: args.accessTokenEncrypted,
      refreshTokenEncrypted: args.refreshTokenEncrypted,
      tokenExpiresAt: args.tokenExpiresAt,
      status: "active",
      lastError: undefined,
    });
  },
});

export const markRefreshFailed = internalMutation({
  args: {
    accountId: v.id("socialAccounts"),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    const account = await ctx.db.get(args.accountId);
    if (!account) return;

    // If token is actually expired, mark as expired
    const isExpired =
      account.tokenExpiresAt && account.tokenExpiresAt < Date.now();

    await ctx.db.patch(args.accountId, {
      status: isExpired ? "expired" : "error",
      lastError: args.error,
    });
  },
});

// ─── Refresh a single account's token ───

export const refreshAccount = internalAction({
  args: {
    accountId: v.id("socialAccounts"),
    platform: v.union(
      v.literal("instagram"),
      v.literal("tiktok"),
      v.literal("twitter"),
      v.literal("threads")
    ),
    accessTokenEncrypted: v.string(),
    refreshTokenEncrypted: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      let newAccessEncrypted: string;
      let newRefreshEncrypted: string | undefined;
      let newExpiresAt: number | undefined;

      switch (args.platform) {
        // ── Instagram: refresh using current access token ──
        case "instagram": {
          const currentToken = await decrypt(args.accessTokenEncrypted);
          const result = await refreshInstagramToken(currentToken);
          newAccessEncrypted = await encrypt(result.access_token);
          newExpiresAt = Date.now() + result.expires_in * 1000;
          break;
        }

        // ── Threads: refresh using current access token ──
        case "threads": {
          const currentToken = await decrypt(args.accessTokenEncrypted);
          const result = await refreshThreadsToken(currentToken);
          newAccessEncrypted = await encrypt(result.access_token);
          newExpiresAt = Date.now() + result.expires_in * 1000;
          break;
        }

        // ── TikTok: refresh using refresh_token + client creds ──
        case "tiktok": {
          if (!args.refreshTokenEncrypted) {
            throw new Error("No refresh token available for TikTok");
          }
          const refreshToken = await decrypt(args.refreshTokenEncrypted);
          const clientKey = process.env.TIKTOK_CLIENT_KEY;
          const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
          if (!clientKey || !clientSecret) {
            throw new Error("Missing TIKTOK_CLIENT_KEY or TIKTOK_CLIENT_SECRET");
          }

          const result = await refreshTikTokToken(
            refreshToken,
            clientKey,
            clientSecret
          );

          newAccessEncrypted = await encrypt(result.access_token);
          newRefreshEncrypted = await encrypt(result.refresh_token);
          newExpiresAt = Date.now() + result.expires_in * 1000;
          break;
        }

        // ── Twitter: refresh using refresh_token + client creds ──
        case "twitter": {
          if (!args.refreshTokenEncrypted) {
            throw new Error("No refresh token available for Twitter");
          }
          const refreshToken = await decrypt(args.refreshTokenEncrypted);
          const clientId = process.env.TWITTER_CLIENT_ID;
          const clientSecret = process.env.TWITTER_CLIENT_SECRET;
          if (!clientId || !clientSecret) {
            throw new Error(
              "Missing TWITTER_CLIENT_ID or TWITTER_CLIENT_SECRET"
            );
          }

          const result = await refreshTwitterToken(
            refreshToken,
            clientId,
            clientSecret
          );

          newAccessEncrypted = await encrypt(result.access_token);
          newRefreshEncrypted = await encrypt(result.refresh_token);
          newExpiresAt = Date.now() + result.expires_in * 1000;
          break;
        }
      }

      // Save the refreshed tokens
      await ctx.runMutation(internal.tokenRefresh.updateTokens, {
        accountId: args.accountId,
        accessTokenEncrypted: newAccessEncrypted!,
        refreshTokenEncrypted: newRefreshEncrypted,
        tokenExpiresAt: newExpiresAt,
      });

      console.log(
        `Token refreshed for ${args.platform} account ${args.accountId}`
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(
        `Token refresh failed for ${args.platform} account ${args.accountId}: ${message}`
      );

      await ctx.runMutation(internal.tokenRefresh.markRefreshFailed, {
        accountId: args.accountId,
        error: `Token refresh failed: ${message}`,
      });
    }
  },
});

// ─── Cron: find all accounts needing refresh and kick off refreshes ───

export const findAndRefreshExpiring = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Get all active accounts with tokens expiring within the buffer window
    const expiring = await ctx.db
      .query("socialAccounts")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    // Filter per-platform: each platform has its own buffer window.
    // Facebook page tokens don't expire, so they won't have tokenExpiresAt.
    const needsRefresh = expiring.filter((a) => {
      if (a.platform === "facebook") return false;
      if (!a.tokenExpiresAt) return false;
      const buffer = PLATFORM_REFRESH_BUFFER_MS[a.platform] ?? 0;
      return a.tokenExpiresAt < now + buffer;
    });

    // Schedule refresh actions for each
    for (const account of needsRefresh) {
      if (
        account.platform === "facebook" // skip, handled differently
      ) {
        continue;
      }

      await ctx.scheduler.runAfter(0, internal.tokenRefresh.refreshAccount, {
        accountId: account._id,
        platform: account.platform as
          | "instagram"
          | "tiktok"
          | "twitter"
          | "threads",
        accessTokenEncrypted: account.accessTokenEncrypted,
        refreshTokenEncrypted: account.refreshTokenEncrypted,
      });
    }

    return {
      checked: expiring.length,
      refreshing: needsRefresh.length,
    };
  },
});

// ─── Manual refresh: user-triggered from the UI ───

export const manualRefresh = internalAction({
  args: {
    accountId: v.id("socialAccounts"),
  },
  handler: async (ctx, args) => {
    // Fetch account from DB via query
    const account = await ctx.runQuery(
      internal.tokenRefresh.getAccountForRefresh,
      { accountId: args.accountId }
    );

    if (!account) {
      throw new Error("Account not found");
    }

    if (account.platform === "facebook") {
      throw new Error(
        "Facebook page tokens are long-lived and cannot be refreshed automatically. " +
          "Please reconnect the account if the token has been revoked."
      );
    }

    // Delegate to the standard refresh flow
    await ctx.runAction(internal.tokenRefresh.refreshAccount, {
      accountId: account._id,
      platform: account.platform as
        | "instagram"
        | "tiktok"
        | "twitter"
        | "threads",
      accessTokenEncrypted: account.accessTokenEncrypted,
      refreshTokenEncrypted: account.refreshTokenEncrypted,
    });
  },
});

export const getAccountForRefresh = internalQuery({
  args: { accountId: v.id("socialAccounts") },
  handler: async (ctx, args) => {
    return ctx.db.get(args.accountId);
  },
});

// ─── Refresh-before-publish: guarantee a fresh token at call time ───
//
// Callers (the publish pipeline) invoke this immediately before decrypting
// and using the access token. If the token has less than PUBLISH_REFRESH_BUFFER_MS
// left, we refresh synchronously so the publish call can't land on an
// already-expired token. Safe to call on any account; it's a no-op for
// platforms without an expiry (Facebook page tokens) or accounts that still
// have plenty of time left.

export const ensureFreshToken = internalAction({
  args: {
    accountId: v.id("socialAccounts"),
  },
  handler: async (ctx, args) => {
    const account = await ctx.runQuery(
      internal.tokenRefresh.getAccountForRefresh,
      { accountId: args.accountId }
    );
    if (!account) return;

    // Facebook page tokens are long-lived and have no refresh API
    if (account.platform === "facebook") return;

    // No expiry recorded: nothing to do
    if (!account.tokenExpiresAt) return;

    // Still plenty of time left
    if (account.tokenExpiresAt > Date.now() + PUBLISH_REFRESH_BUFFER_MS) return;

    await ctx.runAction(internal.tokenRefresh.refreshAccount, {
      accountId: account._id,
      platform: account.platform as
        | "instagram"
        | "tiktok"
        | "twitter"
        | "threads",
      accessTokenEncrypted: account.accessTokenEncrypted,
      refreshTokenEncrypted: account.refreshTokenEncrypted,
    });
  },
});
