// Shared types for all platform publishers

export type ContentType =
  | "text"
  | "image"
  | "carousel"
  | "video"
  | "reel"
  | "story"

export interface PublishOptions {
  accessToken: string
  platformAccountId: string // page ID, user ID, etc.
  contentType: ContentType
  caption?: string
  mediaUrls: string[] // public URLs (from Convex storage)
  mediaMimeTypes?: string[] // parallel array of mime types (needed when URL has no extension)
}

export interface PublishResult {
  success: boolean
  platformPostId?: string
  platformPostUrl?: string
  error?: string
}
