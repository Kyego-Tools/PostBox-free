import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export const create = internalMutation({
  args: {
    userId: v.id("users"),
    platform: v.union(
      v.literal("facebook"),
      v.literal("instagram"),
      v.literal("tiktok"),
      v.literal("twitter"),
      v.literal("threads")
    ),
    state: v.string(),
    codeVerifier: v.optional(v.string()),
    redirectUrl: v.string(),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("oauthStates", {
      userId: args.userId,
      platform: args.platform,
      state: args.state,
      codeVerifier: args.codeVerifier,
      redirectUrl: args.redirectUrl,
      expiresAt: Date.now() + STATE_TTL_MS,
      used: false,
    });
  },
});

export const validate = internalQuery({
  args: {
    state: v.string(),
    platform: v.union(
      v.literal("facebook"),
      v.literal("instagram"),
      v.literal("tiktok"),
      v.literal("twitter"),
      v.literal("threads")
    ),
  },
  handler: async (ctx, args) => {
    const record = await ctx.db
      .query("oauthStates")
      .withIndex("by_state", (q) => q.eq("state", args.state))
      .unique();

    if (!record) return null;
    if (record.platform !== args.platform) return null;
    if (record.used) return null;
    if (record.expiresAt < Date.now()) return null;

    return record;
  },
});

export const markUsed = internalMutation({
  args: { id: v.id("oauthStates") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { used: true });
  },
});

export const cleanup = internalMutation({
  args: {},
  handler: async (ctx) => {
    const expired = await ctx.db
      .query("oauthStates")
      .withIndex("by_expiresAt")
      .filter((q) => q.lt(q.field("expiresAt"), Date.now()))
      .collect();

    for (const record of expired) {
      await ctx.db.delete(record._id);
    }

    return { deleted: expired.length };
  },
});
