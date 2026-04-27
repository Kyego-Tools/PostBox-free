// Instagram reach time series (graph.instagram.com)
// `reach` is the ONLY Instagram account metric that supports metric_type=time_series
// giving daily breakdown values.

import type { FollowerHistoryPoint } from "./types";

const API = "https://graph.instagram.com";

/** Returns daily reach values as {date, value}[] */
export async function fetchInstagramReachHistory(
  userId: string,
  token: string,
  days: number = 30,
): Promise<FollowerHistoryPoint[]> {
  const until = new Date();
  const since = new Date();
  since.setDate(since.getDate() - days);

  const params = new URLSearchParams({
    metric: "reach",
    period: "day",
    metric_type: "time_series",
    since: Math.floor(since.getTime() / 1000).toString(),
    until: Math.floor(until.getTime() / 1000).toString(),
    access_token: token,
  });

  try {
    const res = await fetch(`${API}/${userId}/insights?${params}`);
    if (!res.ok) {
      console.error("Instagram reach time_series error:", await res.text());
      return [];
    }

    const data = await res.json();
    const values = data.data?.[0]?.values ?? [];

    return values.map((v: { end_time: string; value: number }) => ({
      date: v.end_time.split("T")[0],
      value: v.value ?? 0,
    }));
  } catch (e) {
    console.error("Instagram reach fetch failed:", e);
    return [];
  }
}
