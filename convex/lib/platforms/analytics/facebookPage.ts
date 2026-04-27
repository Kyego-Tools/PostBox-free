// Facebook Page-level insights (Graph API v25.0)
// Metrics updated post-Nov 2025 deprecation

import type { PageInsightsData } from "./types";

const API = "https://graph.facebook.com/v25.0";

async function fetchMetric(
  pageId: string,
  metric: string,
  period: string,
  token: string,
): Promise<number> {
  const params = new URLSearchParams({
    period,
    access_token: token,
  });
  // Use metric in URL path
  const res = await fetch(`${API}/${pageId}/insights/${metric}?${params}`);
  if (!res.ok) return 0;

  const data = await res.json();
  const values = data.data?.[0]?.values;
  if (!values?.length) return 0;
  return values[values.length - 1]?.value ?? 0;
}

export async function fetchPageInsights(
  pageId: string,
  token: string,
  period: "day" | "week" | "days_28" = "days_28",
): Promise<PageInsightsData> {
  // Fetch follower_count from page object
  const pageRes = await fetch(
    `${API}/${pageId}?fields=followers_count&access_token=${token}`,
  );
  const pageData = pageRes.ok ? await pageRes.json() : {};

  // Fetch metrics in parallel (using current non-deprecated metrics)
  const [views, engagements, reach, profileViews] = await Promise.all([
    fetchMetric(pageId, "page_media_view", period, token),
    fetchMetric(pageId, "page_post_engagements", period, token),
    fetchMetric(pageId, "page_total_media_view_unique", period, token),
    fetchMetric(pageId, "page_views_total", "day", token),
  ]);

  return {
    followers: pageData.followers_count ?? 0,
    views,
    engagements,
    reach,
    profileViews,
  };
}
