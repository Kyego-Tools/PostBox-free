// Facebook Graph API publishing

import { postForm, apiGet } from "./helpers"
import type { PublishOptions, PublishResult } from "./types"

const API = "https://graph.facebook.com/v22.0"

export async function publishToFacebook(
  opts: PublishOptions
): Promise<PublishResult> {
  const {
    accessToken,
    platformAccountId: pageId,
    contentType,
    caption,
    mediaUrls,
    mediaMimeTypes,
  } = opts

  console.log("[facebook] publishToFacebook", {
    pageId,
    contentType,
    mediaUrls,
    mediaMimeTypes,
  })

  try {
    let postId: string

    switch (contentType) {
      case "image":
        postId =
          mediaUrls.length > 1
            ? await publishMultiPhoto(accessToken, pageId, mediaUrls, caption)
            : await publishPhoto(accessToken, pageId, mediaUrls[0], caption)
        break
      case "video":
      case "reel":
        postId = await publishVideo(accessToken, pageId, mediaUrls[0], caption)
        break
      case "story":
        postId = await publishStory(
          accessToken,
          pageId,
          mediaUrls[0],
          mediaMimeTypes?.[0]
        )
        break
      default:
        postId = await publishText(accessToken, pageId, caption || "")
    }

    console.log("[facebook] published ok", { postId, contentType })
    const url = await getPermalink(accessToken, postId)
    return { success: true, platformPostId: postId, platformPostUrl: url }
  } catch (error) {
    console.error(
      "[facebook] publishToFacebook error",
      contentType,
      (error as Error).message
    )
    return { success: false, error: (error as Error).message }
  }
}

async function publishText(
  token: string,
  pageId: string,
  message: string
): Promise<string> {
  const res = await postForm<{ id: string }>(`${API}/${pageId}/feed`, {
    message,
    access_token: token,
  })
  return res.id
}

async function publishPhoto(
  token: string,
  pageId: string,
  imageUrl: string,
  caption?: string
): Promise<string> {
  const params: Record<string, string> = { url: imageUrl, access_token: token }
  if (caption) params.message = caption

  const res = await postForm<{ id: string; post_id?: string }>(
    `${API}/${pageId}/photos`,
    params
  )
  return res.post_id || res.id
}

async function publishMultiPhoto(
  token: string,
  pageId: string,
  imageUrls: string[],
  caption?: string
): Promise<string> {
  // Upload each photo unpublished
  const photoIds: string[] = []
  for (const url of imageUrls) {
    const res = await postForm<{ id: string }>(`${API}/${pageId}/photos`, {
      url,
      published: "false",
      access_token: token,
    })
    photoIds.push(res.id)
  }

  // Create post with all photos
  const attached_media = photoIds.map((id) => ({ media_fbid: id }))
  const res = await fetch(`${API}/${pageId}/feed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: caption || "",
      attached_media,
      access_token: token,
    }),
  })

  if (!res.ok) throw new Error(`Multi-photo failed: ${await res.text()}`)
  const data = (await res.json()) as { id: string }
  return data.id
}

async function publishStory(
  token: string,
  pageId: string,
  mediaUrl: string,
  mimeType?: string
): Promise<string> {
  const isVideo = mimeType
    ? mimeType.startsWith("video/")
    : /\.(mp4|mov|webm)/i.test(mediaUrl)
  console.log("[facebook] publishStory", {
    pageId,
    mediaUrl,
    mimeType,
    isVideo,
  })

  try {
    if (isVideo) {
      return await publishVideoStory(token, pageId, mediaUrl)
    } else {
      const endpoint = `${API}/${pageId}/photo_stories`
      console.log("[facebook] posting photo story to", endpoint)
      const res = await postForm<{ id: string }>(endpoint, {
        url: mediaUrl,
        access_token: token,
      })
      console.log("[facebook] photo_stories response", res)
      return res.id
    }
  } catch (error) {
    console.error(
      "[facebook] publishStory error",
      { isVideo, mimeType },
      (error as Error).message
    )
    throw error
  }
}

async function publishVideoStory(
  token: string,
  pageId: string,
  videoUrl: string
): Promise<string> {
  // Facebook video stories require a 3-phase resumable upload (no file_url shortcut)

  // 1. Fetch video bytes
  console.log("[facebook] fetching video for story upload", videoUrl)
  const videoResponse = await fetch(videoUrl)
  if (!videoResponse.ok)
    throw new Error(`Failed to fetch video: ${videoResponse.status}`)
  const videoBuffer = await videoResponse.arrayBuffer()
  const videoSize = videoBuffer.byteLength
  console.log("[facebook] video fetched, size bytes:", videoSize)

  // 2. Start upload session
  const startRes = await postForm<{ video_id: string; upload_url: string }>(
    `${API}/${pageId}/video_stories`,
    {
      upload_phase: "start",
      video_file_size: String(videoSize),
      access_token: token,
    }
  )
  const { video_id, upload_url } = startRes
  console.log("[facebook] video story upload session started", {
    video_id,
    upload_url,
  })

  // 3. Transfer video bytes to Facebook's upload endpoint
  const transferRes = await fetch(upload_url, {
    method: "POST",
    headers: {
      Authorization: `OAuth ${token}`,
      offset: "0",
      file_size: String(videoSize),
    },
    body: videoBuffer,
  })
  if (!transferRes.ok) {
    const text = await transferRes.text()
    throw new Error(`Video story transfer failed: ${text}`)
  }
  console.log("[facebook] video transfer complete")

  // 4. Finish upload → publishes the story
  const finishRes = await postForm<{ success: boolean; video_id?: string }>(
    `${API}/${pageId}/video_stories`,
    { upload_phase: "finish", video_id, access_token: token }
  )
  console.log("[facebook] video story finish", finishRes)
  return video_id
}

async function publishVideo(
  token: string,
  pageId: string,
  videoUrl: string,
  caption?: string
): Promise<string> {
  const params: Record<string, string> = {
    file_url: videoUrl,
    access_token: token,
  }
  if (caption) params.description = caption

  const res = await postForm<{ id: string }>(`${API}/${pageId}/videos`, params)
  return res.id
}

async function getPermalink(
  token: string,
  postId: string
): Promise<string | undefined> {
  try {
    const res = await apiGet<{ permalink_url?: string }>(
      `${API}/${postId}?fields=permalink_url&access_token=${token}`
    )
    return res.permalink_url
  } catch {
    return undefined
  }
}
