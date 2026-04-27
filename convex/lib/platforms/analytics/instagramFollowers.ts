// Instagram follower history (graph.instagram.com)
// follows_and_unfollows only supports total_value (NOT time_series).
// We use windowed fetches with hybrid granularity (daily recent + weekly older)
// to get real net-change per period, then reconstruct the cumulative follower
// count backwards from the current total.

import type { FollowerHistoryPoint } from "./types";
import { buildWindows, batchAll, BATCH_SIZE } from "./windowUtils";
import type { Window } from "./windowUtils";

const API = "https://graph.instagram.com";

/** Fetch net follower change for a single time window */
async function fetchWindow(
  userId: string,
  token: string,
  window: Window,
): Promise<{ label: string; netChange: number }> {
  const params = new URLSearchParams({
    metric: "follows_and_unfollows",
    period: "day",
    metric_type: "total_value",
    breakdown: "follow_type",
    since: Math.floor(window.since.getTime() / 1000).toString(),
    until: Math.floor(window.until.getTime() / 1000).toString(),
    access_token: token,
  });

  try {
    const res = await fetch(`${API}/${userId}/insights?${params}`);
    if (!res.ok) {
      console.error(
        `Instagram followers window error (${window.label}):`,
        await res.text(),
      );
      return { label: window.label, netChange: 0 };
    }

    const data = await res.json();
    const totalValue = data.data?.[0]?.total_value;
    if (!totalValue) return { label: window.label, netChange: 0 };

    // Parse breakdown: FOLLOWER = follows, NON_FOLLOWER = unfollows
    const breakdowns = totalValue.breakdowns as
      | { results: { dimension_values?: string[]; value?: number }[] }[]
      | undefined;

    if (breakdowns?.[0]?.results) {
      let follows = 0;
      let unfollows = 0;
      for (const r of breakdowns[0].results) {
        const type = r.dimension_values?.[0];
        if (type === "FOLLOWER") follows = r.value ?? 0;
        if (type === "NON_FOLLOWER") unfollows = r.value ?? 0;
      }
      return { label: window.label, netChange: follows - unfollows };
    }

    // Fallback: plain total_value.value
    if (typeof totalValue.value === "number") {
      return { label: window.label, netChange: totalValue.value };
    }

    return { label: window.label, netChange: 0 };
  } catch (e) {
    console.error(`Instagram followers window failed (${window.label}):`, e);
    return { label: window.label, netChange: 0 };
  }
}

/**
 * Fetches real follower net-change per time window using hybrid granularity,
 * then reconstructs the cumulative follower count backwards from the current total.
 */
export async function fetchInstagramFollowerHistory(
  userId: string,
  token: string,
  days: number = 90,
): Promise<FollowerHistoryPoint[]> {
  // 1. Get current follower count
  const userRes = await fetch(
    `${API}/${userId}?fields=followers_count&access_token=${token}`,
  );
  const userData = userRes.ok ? await userRes.json() : {};
  const currentFollowers: number = userData.followers_count ?? 0;

  // 2. Fetch windowed net-changes (hybrid: daily recent + weekly older)
  const windows = buildWindows(days);
  if (windows.length === 0) return [];

  const tasks = windows.map((w) => () => fetchWindow(userId, token, w));
  const windowResults = await batchAll(tasks, BATCH_SIZE);

  // 3. Reconstruct cumulative history backwards from current total
  // windowResults are chronological: oldest → newest
  const totalNetChange = windowResults.reduce((s, w) => s + w.netChange, 0);
  let runningTotal = currentFollowers - totalNetChange;

  const history: FollowerHistoryPoint[] = [];
  for (const w of windowResults) {
    history.push({
      date: w.label,
      value: runningTotal,
    });
    runningTotal += w.netChange;
  }

  // Add today's data point with the actual current count
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  history.push({
    date: today.toISOString().split("T")[0],
    value: currentFollowers,
  });

  return history;
}
