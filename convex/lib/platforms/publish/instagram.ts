// Instagram Content Publishing API (2-step: create container → publish)

import { postForm, apiGet, sleep } from "./helpers"
import type { PublishOptions, PublishResult } from "./types"

const API = "https://graph.instagram.com/v22.0"
const CAROUSEL_ITEM_DELAY_MS = 1000
// Images: 5 × 3s = 15s max. Videos: 60 × 5s = 5 min max.
const POLL_IMAGE = { interval: 3000, attempts: 5 }
const POLL_VIDEO = { interval: 4000, attempts: 60 }

export async function publishToInstagram(
  opts: PublishOptions
): Promise<PublishResult> {
  const {
    accessToken,
    platformAccountId: igUserId,
    contentType,
    caption,
    mediaUrls,
    mediaMimeTypes,
  } = opts

  console.log("[instagram] publishToInstagram", {
    contentType,
    mediaUrlCount: mediaUrls.length,
    firstMediaUrl: mediaUrls[0],
    mediaMimeTypes,
  })

  try {
    let postId: string

    switch (contentType) {
      case "carousel":
        postId = await publishCarousel(
          accessToken,
          igUserId,
          mediaUrls,
          caption
        )
        break
      case "reel":
        postId = await publishReel(accessToken, igUserId, mediaUrls[0], caption)
        break
      case "story":
        postId = await publishStory(
          accessToken,
          igUserId,
          mediaUrls[0],
          mediaMimeTypes?.[0]
        )
        break
      case "video":
        postId = await publishFeedVideo(
          accessToken,
          igUserId,
          mediaUrls[0],
          caption
        )
        break
      default: // feed / single image
        postId = await publishSingleImage(
          accessToken,
          igUserId,
          mediaUrls[0],
          caption
        )
    }

    const url = await getPermalink(accessToken, postId)
    return { success: true, platformPostId: postId, platformPostUrl: url }
  } catch (error) {
    console.error(
      "[instagram] publishToInstagram error",
      (error as Error).message
    )
    return { success: false, error: (error as Error).message }
  }
}

// ─── Single Image ───

async function publishSingleImage(
  token: string,
  userId: string,
  imageUrl: string,
  caption?: string
): Promise<string> {
  const containerId = await createContainer(token, userId, {
    image_url: imageUrl,
    caption,
  })
  await waitForContainer(token, containerId, false)
  return publishContainer(token, userId, containerId)
}

// ─── Carousel ───

async function publishCarousel(
  token: string,
  userId: string,
  mediaUrls: string[],
  caption?: string
): Promise<string> {
  const childIds: string[] = []
  for (const url of mediaUrls) {
    const id = await createContainer(token, userId, {
      image_url: url,
      is_carousel_item: "true",
    })
    childIds.push(id)
    await sleep(CAROUSEL_ITEM_DELAY_MS)
  }

  const carouselId = await createContainer(token, userId, {
    media_type: "CAROUSEL",
    children: childIds.join(","),
    caption,
  })
  await waitForContainer(token, carouselId, false)
  return publishContainer(token, userId, carouselId)
}

// ─── Reel ───

async function publishReel(
  token: string,
  userId: string,
  videoUrl: string,
  caption?: string
): Promise<string> {
  const containerId = await createContainer(token, userId, {
    media_type: "REELS",
    video_url: videoUrl,
    caption,
    share_to_feed: "true",
  })
  await waitForContainer(token, containerId, true)
  return publishContainer(token, userId, containerId)
}

// ─── Story ───

async function publishStory(
  token: string,
  userId: string,
  mediaUrl: string,
  mimeType?: string
): Promise<string> {
  const isVideo = mimeType
    ? mimeType.startsWith("video/")
    : /\.(mp4|mov|webm)/i.test(mediaUrl)
  console.log("[instagram] publishStory", { mediaUrl, mimeType, isVideo })
  const params = {
    media_type: "STORIES",
    ...(isVideo ? { video_url: mediaUrl } : { image_url: mediaUrl }),
  }
  console.log("[instagram] createContainer params", params)
  const containerId = await createContainer(token, userId, params)
  console.log("[instagram] story container created", containerId)
  await waitForContainer(token, containerId, isVideo)
  return publishContainer(token, userId, containerId)
}

// ─── Feed Video ───

async function publishFeedVideo(
  token: string,
  userId: string,
  videoUrl: string,
  caption?: string
): Promise<string> {
  const containerId = await createContainer(token, userId, {
    media_type: "REELS",
    video_url: videoUrl,
    caption,
    share_to_feed: "true",
  })
  await waitForContainer(token, containerId, true)
  return publishContainer(token, userId, containerId)
}

// ─── Shared helpers ───

async function waitForContainer(
  token: string,
  containerId: string,
  isVideo: boolean
): Promise<void> {
  const { interval, attempts } = isVideo ? POLL_VIDEO : POLL_IMAGE
  for (let i = 0; i < attempts; i++) {
    await sleep(interval)
    const res = await apiGet<{ status_code: string; status?: string }>(
      `${API}/${containerId}?fields=status_code,status&access_token=${token}`
    )
    console.log(
      `[instagram] container ${containerId} status_code=${res.status_code} (attempt ${i + 1}/${attempts})`
    )
    if (res.status_code === "FINISHED") return
    if (res.status_code === "ERROR" || res.status_code === "EXPIRED") {
      throw new Error(
        `Container ${containerId} failed with status: ${res.status_code} — ${res.status ?? ""}`
      )
    }
  }
  throw new Error(
    `Container ${containerId} did not finish after ${attempts} attempts (~${(interval * attempts) / 1000}s)`
  )
}

async function createContainer(
  token: string,
  userId: string,
  params: Record<string, string | undefined>
): Promise<string> {
  const clean: Record<string, string> = { access_token: token }
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) clean[k] = v
  }
  const res = await postForm<{ id: string }>(`${API}/${userId}/media`, clean)
  return res.id
}

async function publishContainer(
  token: string,
  userId: string,
  containerId: string
): Promise<string> {
  const res = await postForm<{ id: string }>(`${API}/${userId}/media_publish`, {
    creation_id: containerId,
    access_token: token,
  })
  return res.id
}

async function getPermalink(
  token: string,
  mediaId: string
): Promise<string | undefined> {
  try {
    const res = await apiGet<{ permalink?: string }>(
      `${API}/${mediaId}?fields=permalink&access_token=${token}`
    )
    return res.permalink
  } catch {
    return undefined
  }
}
