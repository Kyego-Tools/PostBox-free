// Facebook post-level insights (Graph API v25.0)
// Uses post_media_view + post_total_media_view_unique (v25.0 metrics)

import type { PostInsight } from "./types";

const API = "https://graph.facebook.com/v25.0";

async function fetchPostMetrics(
  postId: string,
  token: string,
): Promise<{ views: number; reach: number }> {
  const params = new URLSearchParams({
    access_token: token,
  });

  try {
    // Fetch each metric via URL path
    const [viewsRes, reachRes] = await Promise.all([
      fetch(`${API}/${postId}/insights/post_media_view?${params}`),
      fetch(`${API}/${postId}/insights/post_total_media_view_unique?${params}`),
    ]);

    const viewsData = viewsRes.ok ? await viewsRes.json() : { data: [] };
    const reachData = reachRes.ok ? await reachRes.json() : { data: [] };

    return {
      views: viewsData.data?.[0]?.values?.[0]?.value ?? 0,
      reach: reachData.data?.[0]?.values?.[0]?.value ?? 0,
    };
  } catch {
    return { views: 0, reach: 0 };
  }
}

export async function fetchPagePosts(
  pageId: string,
  token: string,
  limit: number = 25,
): Promise<PostInsight[]> {
  const fields =
    "id,message,created_time,full_picture,permalink_url,shares," +
    "comments.summary(true),reactions.summary(true)";
  const params = new URLSearchParams({
    fields,
    limit: limit.toString(),
    access_token: token,
  });

  const res = await fetch(`${API}/${pageId}/posts?${params}`);
  if (!res.ok) {
    console.error("Facebook Posts API error:", await res.text());
    return [];
  }

  const data = await res.json();
  const posts: PostInsight[] = [];

  for (const post of data.data ?? []) {
    const metrics = await fetchPostMetrics(post.id, token);
    const reactions = post.reactions?.summary?.total_count ?? 0;
    const comments = post.comments?.summary?.total_count ?? 0;
    const shares = post.shares?.count ?? 0;
    const totalEng = reactions + comments + shares;
    const engRate = metrics.views > 0 ? (totalEng / metrics.views) * 100 : 0;

    posts.push({
      postId: post.id,
      message: post.message,
      createdTime: post.created_time,
      fullPicture: post.full_picture,
      permalinkUrl: post.permalink_url,
      views: metrics.views,
      reach: metrics.reach,
      reactions,
      comments,
      shares,
      engagementRate: parseFloat(engRate.toFixed(2)),
    });
  }

  return posts;
}
