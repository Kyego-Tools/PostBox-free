// TikTok Content Publishing API — video via FILE_UPLOAD

import type { PublishOptions, PublishResult } from "./types";

const API = "https://open.tiktokapis.com/v2";

export async function publishToTikTok(
  opts: PublishOptions,
): Promise<PublishResult> {
  const { accessToken, caption, mediaUrls, contentType } = opts;

  if (!mediaUrls.length) {
    return { success: false, error: "TikTok requires media" };
  }

  // TikTok photo API only supports PULL_FROM_URL which requires
  // domain ownership verification — not possible with Convex storage
  const isPhoto = contentType === "image" || contentType === "carousel";
  if (isPhoto) {
    return {
      success: false,
      error: "TikTok photo posts require domain verification. Upload a video instead.",
    };
  }

  try {
    return await publishVideo(accessToken, mediaUrls[0], caption);
  } catch (error) {
    const msg = (error as Error).message;
    console.error("TikTok publish error:", msg);
    return { success: false, error: msg };
  }
}

// ─── Video publishing (FILE_UPLOAD) ───

async function publishVideo(
  token: string,
  mediaUrl: string,
  caption?: string,
): Promise<PublishResult> {
  const videoRes = await fetch(mediaUrl);
  if (!videoRes.ok) throw new Error("Failed to fetch video from storage");
  const videoBytes = await videoRes.arrayBuffer();
  const videoSize = videoBytes.byteLength;
  console.log(`TikTok: video fetched, size=${videoSize} bytes`);

  const isAudited = process.env.TIKTOK_APP_AUDITED === "true";
  const { publishId, uploadUrl } = isAudited
    ? await initDirectVideo(token, videoSize, caption)
    : await initInboxVideo(token, videoSize);

  // Upload video binary via PUT
  console.log(`TikTok: uploading ${videoSize} bytes`);
  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": "video/mp4",
      "Content-Range": `bytes 0-${videoSize - 1}/${videoSize}`,
    },
    body: videoBytes,
  });
  if (!uploadRes.ok) {
    const text = await uploadRes.text();
    throw new Error(`Video upload failed (${uploadRes.status}): ${text}`);
  }

  console.log("TikTok: upload complete, polling status...");
  const result = await pollStatus(token, publishId);
  return buildResult(result, publishId);
}

// ─── Init helpers ───

async function initInboxVideo(token: string, videoSize: number) {
  const res = await tiktokPost<InitResponse>(
    `${API}/post/publish/inbox/video/init/`,
    {
      source_info: {
        source: "FILE_UPLOAD",
        video_size: videoSize,
        chunk_size: videoSize,
        total_chunk_count: 1,
      },
    },
    token,
  );
  return { publishId: res.data.publish_id, uploadUrl: res.data.upload_url! };
}

async function initDirectVideo(
  token: string,
  videoSize: number,
  caption?: string,
) {
  const res = await tiktokPost<InitResponse>(
    `${API}/post/publish/video/init/`,
    {
      post_info: {
        title: caption || "",
        privacy_level: "SELF_ONLY",
        disable_comment: false,
        disable_duet: false,
        disable_stitch: false,
        video_cover_timestamp_ms: 1000,
      },
      source_info: {
        source: "FILE_UPLOAD",
        video_size: videoSize,
        chunk_size: videoSize,
        total_chunk_count: 1,
      },
    },
    token,
  );
  return { publishId: res.data.publish_id, uploadUrl: res.data.upload_url! };
}

// ─── Poll & result ───

function buildResult(result: PollResult, publishId: string): PublishResult {
  const done =
    result.status === "PUBLISH_COMPLETE" ||
    result.status === "SEND_TO_USER_INBOX";
  if (done) {
    return {
      success: true,
      platformPostId: result.postId || publishId,
      platformPostUrl: result.postId
        ? `https://www.tiktok.com/@user/video/${result.postId}`
        : undefined,
    };
  }
  return { success: false, error: result.failReason || "Publishing failed" };
}

async function pollStatus(
  token: string,
  publishId: string,
  maxAttempts = 20,
): Promise<PollResult> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    try {
      const res = await tiktokPost<StatusResponse>(
        `${API}/post/publish/status/fetch/`,
        { publish_id: publishId },
        token,
      );
      const { status } = res.data;
      if (status === "PUBLISH_COMPLETE")
        return { status, postId: res.data.publicaly_available_post_id?.[0] };
      if (status === "SEND_TO_USER_INBOX")
        return { status, postId: publishId };
      if (status === "FAILED")
        return { status, failReason: res.data.fail_reason };
    } catch {
      // Retry on transient errors
    }
  }
  return { status: "TIMEOUT", failReason: "Status check timed out" };
}

// ─── Types & helpers ───

type PollResult = { status: string; postId?: string; failReason?: string };

interface InitResponse {
  data: { publish_id: string; upload_url?: string };
  error: { code: string; message: string };
}

interface StatusResponse {
  data: {
    status: string;
    fail_reason?: string;
    publicaly_available_post_id?: string[];
  };
  error: { code: string; message: string };
}

async function tiktokPost<T>(
  url: string,
  body: unknown,
  token: string,
): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=UTF-8",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  console.log(`TikTok ${res.status}: ${url}`, text.slice(0, 500));

  if (!res.ok) {
    try {
      const err = JSON.parse(text);
      throw new Error(
        `TikTok API ${res.status}: ${err.error?.message || text}`,
      );
    } catch (e) {
      if (e instanceof Error && e.message.startsWith("TikTok API")) throw e;
      throw new Error(`TikTok API ${res.status}: ${text}`);
    }
  }

  return JSON.parse(text) as T;
}
