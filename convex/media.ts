import { mutation, query } from "./_generated/server"
import { v } from "convex/values"
import { requireAuth } from "./lib/auth"

// Generate a signed upload URL for the client
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx)
    return ctx.storage.generateUploadUrl()
  },
})

// Save uploaded file metadata after upload completes
export const saveFile = mutation({
  args: {
    storageId: v.id("_storage"),
    fileName: v.string(),
    mimeType: v.string(),
    sizeBytes: v.number(),
    mediaType: v.union(v.literal("image"), v.literal("video")),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx)
    return ctx.db.insert("mediaFiles", {
      userId,
      storageId: args.storageId,
      fileName: args.fileName,
      mimeType: args.mimeType,
      sizeBytes: args.sizeBytes,
      mediaType: args.mediaType,
      uploadedAt: Date.now(),
    })
  },
})

// List user's media files
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuth(ctx)
    return ctx.db
      .query("mediaFiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect()
  },
})
