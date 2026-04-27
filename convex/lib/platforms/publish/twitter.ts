// X/Twitter API v2 publishing
//
// Uses X API v2 exclusively:
//   - POST /2/tweets          → create a tweet
//   - POST /2/media/upload    → chunked media upload (INIT/APPEND/FINALIZE/STATUS)
//
// Requires OAuth 2.0 with scopes: tweet.write, media.write.

import type { PublishOptions, PublishResult } from "./types";

const API = "https://api.x.com/2";

// Chunk size for APPEND. X accepts up to 5 MB per segment; we use 4 MB to stay
// comfortably below the limit and keep individual requests small.
const CHUNK_SIZE = 4 * 1024 * 1024;

// Tweet char limit (basic, free-tier). Long-form (Premium) not supported here.
const MAX_TWEET_CHARS = 280;

// Max images per tweet
const MAX_IMAGES = 4;

export async function publishToTwitter(
  opts: PublishOptions,
): Promise<PublishResult> {
  const { accessToken, contentType, caption, mediaUrls } = opts;

  console.log("[twitter] publishToTwitter — contentType:", contentType, "mediaUrls:", mediaUrls, "captionLength:", caption?.length);
  try {
    if (caption && caption.length > MAX_TWEET_CHARS) {
      throw new Error(
        `Tweet exceeds ${MAX_TWEET_CHARS} characters (${caption.length}).`,
      );
    }

    let mediaIds: string[] | undefined;

    if (contentType !== "text" && mediaUrls.length > 0) {
      if (mediaUrls.length > MAX_IMAGES) {
        throw new Error(
          `Twitter allows at most ${MAX_IMAGES} media items per tweet.`,
        );
      }
      mediaIds = [];
      for (const url of mediaUrls) {
        console.log("[twitter] uploading media:", url);
        const mediaId = await uploadMediaFromUrl(accessToken, url);
        mediaIds.push(mediaId);
      }
      console.log("[twitter] all media uploaded — mediaIds:", mediaIds);
    }

    console.log("[twitter] creating tweet — mediaIds:", mediaIds);
    const tweet = await createTweet(accessToken, caption, mediaIds);
    const tweetUrl = `https://x.com/i/status/${tweet.id}`;
    console.log("[twitter] tweet created —", tweetUrl);

    return {
      success: true,
      platformPostId: tweet.id,
      platformPostUrl: tweetUrl,
    };
  } catch (error) {
    console.error("[twitter] publish failed:", (error as Error).message);
    return { success: false, error: (error as Error).message };
  }
}

// ─── v2 chunked media upload ────────────────────────────────────────────────

async function uploadMediaFromUrl(
  token: string,
  mediaUrl: string,
): Promise<string> {
  console.log("[twitter] fetchingmedia from URL:", mediaUrl);
  const mediaRes = await fetch(mediaUrl);
  if (!mediaRes.ok) {
    console.error("[twitter] failed to fetch media:", mediaRes.status, mediaRes.statusText);
    throw new Error(`Failed to fetch media: ${mediaRes.statusText}`);
  }

  const blob = await mediaRes.blob();
  const mimeType = blob.type || inferMimeFromUrl(mediaUrl);
  const category = categoryFor(mimeType);
  const totalBytes = blob.size;
  console.log("[twitter] media fetched — mimeType:", mimeType, "category:", category, "size:", totalBytes, "bytes");

  const mediaId = await initUpload(token, totalBytes, mimeType, category);
  console.log("[twitter] INIT done — mediaId:", mediaId);

  // APPEND segments
  const buffer = await blob.arrayBuffer();
  let segmentIndex = 0;
  for (let offset = 0; offset < totalBytes; offset += CHUNK_SIZE) {
    const end = Math.min(offset + CHUNK_SIZE, totalBytes);
    const chunk = new Blob([buffer.slice(offset, end)], { type: mimeType });
    console.log(`[twitter] APPEND segment ${segmentIndex} (${offset}–${end} of ${totalBytes})`);
    await appendChunk(token, mediaId, segmentIndex, chunk);
    segmentIndex++;
  }

  console.log("[twitter] all segments uploaded — sending FINALIZE");
  const processingInfo = await finalizeUpload(token, mediaId);
  console.log("[twitter] FINALIZE done — processingInfo:", JSON.stringify(processingInfo));

  if (processingInfo) {
    await waitForProcessing(token, mediaId, processingInfo);
  }

  console.log("[twitter] media upload complete — mediaId:", mediaId);
  return mediaId;
}

interface ProcessingInfo {
  state: "pending" | "in_progress" | "succeeded" | "failed";
  check_after_secs?: number;
  progress_percent?: number;
  error?: { name?: string; message?: string };
}

// ── INIT: POST /2/media/upload/initialize (JSON body) ──────────────────────
async function initUpload(
  token: string,
  totalBytes: number,
  mimeType: string,
  category: string,
): Promise<string> {
  const payload = { media_type: mimeType, total_bytes: totalBytes, media_category: category };
  console.log("[twitter] INIT →", JSON.stringify(payload));

  const res = await fetch(`${API}/media/upload/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const rawText = await res.text();
  console.log("[twitter] INIT ←", res.status, rawText);

  if (!res.ok) throw new Error(`media INIT failed (${res.status}): ${rawText}`);

  const data = JSON.parse(rawText) as { data?: { id?: string } };
  const id = data.data?.id;
  if (!id) throw new Error(`media INIT: no id in response — ${rawText}`);
  return id;
}

// ── APPEND: POST /2/media/upload/{id}/append (multipart, media + segment_index) ─
async function appendChunk(
  token: string,
  mediaId: string,
  segmentIndex: number,
  chunk: Blob,
): Promise<void> {
  const form = new FormData();
  form.append("media", chunk);
  form.append("segment_index", String(segmentIndex));

  const res = await fetch(`${API}/media/upload/${mediaId}/append`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });

  const rawText = await res.text();
  console.log(`[twitter] APPEND seg ${segmentIndex} ←`, res.status, rawText || "(empty)");

  if (!res.ok) throw new Error(`media APPEND (seg ${segmentIndex}) failed (${res.status}): ${rawText}`);
}

// ── FINALIZE: POST /2/media/upload/{id}/finalize (no body) ──────────────────
async function finalizeUpload(
  token: string,
  mediaId: string,
): Promise<ProcessingInfo | undefined> {
  console.log("[twitter] FINALIZE → mediaId:", mediaId);

  const res = await fetch(`${API}/media/upload/${mediaId}/finalize`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });

  const rawText = await res.text();
  console.log("[twitter] FINALIZE ←", res.status, rawText);

  if (!res.ok) throw new Error(`media FINALIZE failed (${res.status}): ${rawText}`);

  const data = JSON.parse(rawText) as { data?: { processing_info?: ProcessingInfo } };
  return data.data?.processing_info;
}

async function waitForProcessing(
  token: string,
  mediaId: string,
  initial: ProcessingInfo,
): Promise<void> {
  let info = initial;
  // Hard cap to avoid runaway loops (max ~5 min).
  const maxAttempts = 30;
  for (let i = 0; i < maxAttempts; i++) {
    if (info.state === "succeeded") return;
    if (info.state === "failed") {
      throw new Error(
        `media processing failed: ${info.error?.message || info.error?.name || "unknown"}`,
      );
    }

    const wait = Math.max(1, info.check_after_secs ?? 5) * 1000;
    await sleep(wait);

    // GET /2/media/upload?media_id={id}
    const params = new URLSearchParams({ media_id: mediaId });
    const res = await fetch(`${API}/media/upload?${params}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });

    const rawText = await res.text();
    console.log("[twitter] STATUS ←", res.status, rawText);

    if (!res.ok) throw new Error(`media STATUS failed (${res.status}): ${rawText}`);

    const data = JSON.parse(rawText) as { data?: { processing_info?: ProcessingInfo } };
    const next = data.data?.processing_info;
    if (!next) return; // no processing_info → done
    info = next;
  }

  throw new Error("media processing timed out");
}

// ─── Create Tweet (v2) ──────────────────────────────────────────────────────

async function createTweet(
  token: string,
  text?: string,
  mediaIds?: string[],
): Promise<{ id: string }> {
  const body: Record<string, unknown> = {};
  if (text) body.text = text;
  if (mediaIds?.length) body.media = { media_ids: mediaIds };

  console.log("[twitter] POST /2/tweets payload:", JSON.stringify(body));
  const res = await fetch(`${API}/tweets`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const rawText = await res.text();
  console.log("[twitter] POST /2/tweets — status:", res.status, "body:", rawText);

  if (!res.ok) {
    throw new Error(`tweet create failed (${res.status}): ${rawText}`);
  }

  const data = JSON.parse(rawText) as { data: { id: string } };
  return data.data;
}

// ─── helpers ────────────────────────────────────────────────────────────────

function categoryFor(mimeType: string): string {
  if (mimeType === "image/gif") return "tweet_gif";
  if (mimeType.startsWith("video/")) return "tweet_video";
  return "tweet_image";
}

function inferMimeFromUrl(url: string): string {
  const ext = url.split("?")[0].split(".").pop()?.toLowerCase() ?? "";
  switch (ext) {
    case "png": return "image/png";
    case "jpg":
    case "jpeg": return "image/jpeg";
    case "gif": return "image/gif";
    case "webp": return "image/webp";
    case "mp4": return "video/mp4";
    case "mov": return "video/quicktime";
    case "webm": return "video/webm";
    default: return "application/octet-stream";
  }
}

async function toError(res: Response, label: string): Promise<Error> {
  let detail: string;
  try {
    const body = (await res.json()) as Record<string, unknown>;
    detail =
      (body.detail as string | undefined) ??
      (body.title as string | undefined) ??
      (body.error_description as string | undefined) ??
      (body.error as string | undefined) ??
      JSON.stringify(body);
  } catch {
    detail = await res.text().catch(() => res.statusText);
  }
  return new Error(`${label} failed (${res.status}): ${detail}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
