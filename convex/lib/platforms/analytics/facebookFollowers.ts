// Facebook follower history over time (Graph API v25.0)
// Uses page_followers metric in URL path with day period

import type { FollowerHistoryPoint } from "./types";

const API = "https://graph.facebook.com/v25.0";

export async function fetchFollowerHistory(
  pageId: string,
  token: string,
  days: number = 30,
): Promise<FollowerHistoryPoint[]> {
  const until = new Date();
  const since = new Date();
  since.setDate(since.getDate() - days);

  const params = new URLSearchParams({
    period: "day",
    since: Math.floor(since.getTime() / 1000).toString(),
    until: Math.floor(until.getTime() / 1000).toString(),
    access_token: token,
  });

  // Use metric in URL path (not query param)
  const res = await fetch(`${API}/${pageId}/insights/page_follows?${params}`);
  if (!res.ok) {
    console.error("Failed to fetch follower history:", await res.text());
    return [];
  }

  const data = await res.json();
  const values = data.data?.[0]?.values ?? [];

  return values.map((v: { end_time: string; value: number }) => ({
    date: v.end_time.split("T")[0],
    value: v.value,
  }));
}
