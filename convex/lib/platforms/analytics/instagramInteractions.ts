// Instagram account-level interactions (graph.instagram.com)
// likes, comments, shares only support total_value (NOT time_series).
// We use windowed fetches with hybrid granularity (daily recent + weekly older)
// to get real per-period totals. Weekly windows are normalized to daily averages
// so the chart scales consistently across all range filters.

import { buildWindows, batchAll, BATCH_SIZE } from "./windowUtils";
import type { Window } from "./windowUtils";

const API = "https://graph.instagram.com";

export type InteractionHistoryPoint = {
  date: string;
  likes: number;
  comments: number;
  shares: number;
};

/** Fetch interaction totals for a single time window */
async function fetchWindow(
  userId: string,
  token: string,
  window: Window,
): Promise<InteractionHistoryPoint> {
  const params = new URLSearchParams({
    metric: "likes,comments,shares",
    period: "day",
    metric_type: "total_value",
    since: Math.floor(window.since.getTime() / 1000).toString(),
    until: Math.floor(window.until.getTime() / 1000).toString(),
    access_token: token,
  });

  try {
    const res = await fetch(`${API}/${userId}/insights?${params}`);
    if (!res.ok) {
      console.error(
        `Instagram interactions window error (${window.label}):`,
        await res.text(),
      );
      return { date: window.label, likes: 0, comments: 0, shares: 0 };
    }

    const data = await res.json();
    let likes = 0;
    let comments = 0;
    let shares = 0;

    for (const metric of data.data ?? []) {
      const value = metric.total_value?.value ?? 0;
      if (metric.name === "likes") likes = value;
      else if (metric.name === "comments") comments = value;
      else if (metric.name === "shares") shares = value;
    }

    // Normalize multi-day windows to daily averages so the chart
    // scales consistently (a 7-day window doesn't spike vs a 1-day window)
    const span = window.spanDays;
    if (span > 1) {
      likes = Math.round(likes / span);
      comments = Math.round(comments / span);
      shares = Math.round(shares / span);
    }

    return { date: window.label, likes, comments, shares };
  } catch (e) {
    console.error(`Instagram interactions window failed (${window.label}):`, e);
    return { date: window.label, likes: 0, comments: 0, shares: 0 };
  }
}

/**
 * Fetches real interaction data using hybrid windowed requests.
 * Returns {date, likes, comments, shares}[] — weekly windows are
 * normalized to daily averages for consistent chart scaling.
 */
export async function fetchInstagramInteractionsHistory(
  userId: string,
  token: string,
  days: number = 90,
): Promise<InteractionHistoryPoint[]> {
  const windows = buildWindows(days);
  if (windows.length === 0) return [];

  const tasks = windows.map((w) => () => fetchWindow(userId, token, w));
  return batchAll(tasks, BATCH_SIZE);
}
