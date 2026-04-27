// Instagram account-level insights (graph.instagram.com)
// Uses Instagram API with Instagram Login
// Metrics: views, reach, total_interactions, accounts_engaged, follows_and_unfollows

import type { PageInsightsData } from "./types";

const API = "https://graph.instagram.com";

export async function fetchInstagramInsights(
  userId: string,
  token: string,
  days: number = 28,
): Promise<PageInsightsData> {
  // Get follower count from user node
  const userRes = await fetch(
    `${API}/${userId}?fields=followers_count&access_token=${token}`,
  );
  const userData = userRes.ok ? await userRes.json() : {};

  // Fetch account insights with since/until (period=day required)
  const until = new Date();
  const since = new Date();
  since.setDate(since.getDate() - days);

  const metrics = "views,reach,total_interactions,accounts_engaged,profile_links_taps";
  const params = new URLSearchParams({
    metric: metrics,
    period: "day",
    metric_type: "total_value",
    since: Math.floor(since.getTime() / 1000).toString(),
    until: Math.floor(until.getTime() / 1000).toString(),
    access_token: token,
  });

  const res = await fetch(`${API}/${userId}/insights?${params}`);
  if (!res.ok) {
    console.error("Instagram Insights API error:", await res.text());
    return {
      followers: userData.followers_count ?? 0,
      views: 0,
      engagements: 0,
      reach: 0,
      profileViews: 0,
    };
  }

  const data = await res.json();
  const metricsMap: Record<string, number> = {};

  for (const item of data.data ?? []) {
    metricsMap[item.name] = item.total_value?.value ?? 0;
  }

  return {
    followers: userData.followers_count ?? 0,
    views: metricsMap.views ?? 0,
    engagements: metricsMap.total_interactions ?? 0,
    reach: metricsMap.reach ?? 0,
    profileViews: metricsMap.profile_links_taps ?? 0,
  };
}
