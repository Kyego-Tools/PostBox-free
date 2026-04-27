// Instagram media/post insights (graph.instagram.com)
// Fetches recent media with per-post metrics

import type { PostInsight } from "./types";

const API = "https://graph.instagram.com";

async function fetchMediaInsights(
  mediaId: string,
  mediaType: string,
  token: string,
): Promise<{ views: number; reach: number; saved: number; shares: number }> {
  // Metrics vary by media type
  const metrics =
    mediaType === "REELS"
      ? "reach,saved,views,shares"
      : mediaType === "STORY"
        ? "reach,views,shares"
        : "reach,saved,views";

  const params = new URLSearchParams({
    metric: metrics,
    access_token: token,
  });

  try {
    const res = await fetch(`${API}/${mediaId}/insights?${params}`);
    if (!res.ok) return { views: 0, reach: 0, saved: 0, shares: 0 };

    const data = await res.json();
    const map: Record<string, number> = {};
    for (const item of data.data ?? []) {
      map[item.name] = item.values?.[0]?.value ?? 0;
    }
    return {
      views: map.views ?? 0,
      reach: map.reach ?? 0,
      saved: map.saved ?? 0,
      shares: map.shares ?? 0,
    };
  } catch {
    return { views: 0, reach: 0, saved: 0, shares: 0 };
  }
}

export async function fetchInstagramPosts(
  userId: string,
  token: string,
  limit: number = 25,
): Promise<PostInsight[]> {
  const fields =
    "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count";
  const params = new URLSearchParams({
    fields,
    limit: limit.toString(),
    access_token: token,
  });

  const res = await fetch(`${API}/${userId}/media?${params}`);
  if (!res.ok) {
    console.error("Instagram Media API error:", await res.text());
    return [];
  }

  const data = await res.json();
  const posts: PostInsight[] = [];

  for (const media of data.data ?? []) {
    const insights = await fetchMediaInsights(media.id, media.media_type, token);
    const likes = media.like_count ?? 0;
    const comments = media.comments_count ?? 0;
    const totalEng = likes + comments + insights.saved + insights.shares;
    const engRate = insights.views > 0 ? (totalEng / insights.views) * 100 : 0;

    posts.push({
      postId: media.id,
      message: media.caption,
      createdTime: media.timestamp,
      fullPicture: media.thumbnail_url ?? media.media_url,
      permalinkUrl: media.permalink,
      views: insights.views,
      reach: insights.reach,
      reactions: likes,
      comments,
      shares: insights.shares,
      engagementRate: parseFloat(engRate.toFixed(2)),
    });
  }

  return posts;
}
