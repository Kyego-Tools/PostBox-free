// Threads Graph API publishing
//
// Two-step container flow (same model as Instagram):
//   1. POST /{userId}/threads       → create container
//   2. Poll container until FINISHED
//   3. POST /{userId}/threads_publish → publish
//
// Scopes required: threads_basic, threads_content_publish

import { postJson, apiGet, sleep } from "./helpers";
import type { PublishOptions, PublishResult } from "./types";

const API = "https://graph.threads.net/v1.0";

const POLL_IMAGE = { interval: 3_000, attempts: 8 };   // 24 s max
const POLL_VIDEO = { interval: 10_000, attempts: 30 };  // 5 min max

export async function publishToThreads(opts: PublishOptions): Promise<PublishResult> {
  const { accessToken, platformAccountId: userId, contentType, caption, mediaUrls, mediaMimeTypes } = opts;
  console.log("[threads] publishToThreads", { userId, contentType, mediaCount: mediaUrls.length });

  try {
    const isVideo = (url: string, mime?: string) =>
      mime ? mime.startsWith("video/") : (contentType === "video" || contentType === "reel");

    let containerId: string;

    if (contentType === "text" || mediaUrls.length === 0) {
      containerId = await createTextContainer(accessToken, userId, caption ?? "");
    } else if (mediaUrls.length > 1) {
      containerId = await createCarouselContainer(accessToken, userId, mediaUrls, mediaMimeTypes, caption);
    } else {
      const mediaType = isVideo(mediaUrls[0], mediaMimeTypes?.[0]) ? "VIDEO" : "IMAGE";
      containerId = await createMediaContainer(accessToken, userId, mediaType, mediaUrls[0], caption);
    }

    console.log("[threads] container created", containerId);
    const hasVideo = contentType === "video" || contentType === "reel" || mediaMimeTypes?.some((m) => m.startsWith("video/"));
    await waitForContainer(accessToken, containerId, !!hasVideo);

    const postId = await publishContainer(accessToken, userId, containerId);
    console.log("[threads] published", postId);

    const permalink = await getPermalink(accessToken, postId);
    return { success: true, platformPostId: postId, platformPostUrl: permalink };
  } catch (error) {
    console.error("[threads] publishToThreads error", (error as Error).message);
    return { success: false, error: (error as Error).message };
  }
}

// ─── Container creation ──────────────────────────────────────────────────────

async function createTextContainer(token: string, userId: string, text: string): Promise<string> {
  const res = await postJson<{ id: string }>(`${API}/${userId}/threads`, { media_type: "TEXT", text }, authHeader(token));
  return res.id;
}

async function createMediaContainer(
  token: string,
  userId: string,
  mediaType: "IMAGE" | "VIDEO",
  mediaUrl: string,
  caption?: string,
  isCarouselItem = false,
): Promise<string> {
  const body: Record<string, unknown> = {
    media_type: mediaType,
    [mediaType === "VIDEO" ? "video_url" : "image_url"]: mediaUrl,
    ...(caption && !isCarouselItem ? { text: caption } : {}),
    ...(isCarouselItem ? { is_carousel_item: true } : {}),
  };
  const res = await postJson<{ id: string }>(`${API}/${userId}/threads`, body, authHeader(token));
  return res.id;
}

async function createCarouselContainer(
  token: string,
  userId: string,
  mediaUrls: string[],
  mimeTypes?: string[],
  caption?: string,
): Promise<string> {
  // 1. Upload each item as an individual (unpublished) container
  const itemIds: string[] = [];
  for (let i = 0; i < mediaUrls.length; i++) {
    const mime = mimeTypes?.[i];
    const mediaType = mime?.startsWith("video/") ? "VIDEO" : "IMAGE";
    const id = await createMediaContainer(token, userId, mediaType, mediaUrls[i], undefined, true);
    await waitForContainer(token, id, mediaType === "VIDEO");
    itemIds.push(id);
  }

  // 2. Create the carousel container
  const res = await postJson<{ id: string }>(
    `${API}/${userId}/threads`,
    { media_type: "CAROUSEL", children: itemIds, ...(caption ? { text: caption } : {}) },
    authHeader(token),
  );
  return res.id;
}

// ─── Container polling ───────────────────────────────────────────────────────

async function waitForContainer(token: string, containerId: string, isVideo = false): Promise<void> {
  const { interval, attempts } = isVideo ? POLL_VIDEO : POLL_IMAGE;

  for (let i = 0; i < attempts; i++) {
    await sleep(interval);
    const res = await apiGet<{ status?: string; error_message?: string }>(
      `${API}/${containerId}?fields=status,error_message&access_token=${token}`,
    );
    console.log("[threads] container status", containerId, res.status);

    if (res.status === "FINISHED") return;
    if (res.status === "ERROR" || res.status === "EXPIRED") {
      throw new Error(`Container ${res.status}: ${res.error_message ?? "unknown error"}`);
    }
    // IN_PROGRESS → keep polling
  }
  throw new Error("Threads container timed out waiting for FINISHED");
}

// ─── Publish & permalink ─────────────────────────────────────────────────────

async function publishContainer(token: string, userId: string, containerId: string): Promise<string> {
  const res = await postJson<{ id: string }>(
    `${API}/${userId}/threads_publish`,
    { creation_id: containerId },
    authHeader(token),
  );
  return res.id;
}

async function getPermalink(token: string, postId: string): Promise<string | undefined> {
  try {
    const res = await apiGet<{ permalink?: string }>(
      `${API}/${postId}?fields=permalink&access_token=${token}`,
    );
    return res.permalink;
  } catch {
    return undefined;
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function authHeader(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}
