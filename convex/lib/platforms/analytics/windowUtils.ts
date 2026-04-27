// Shared windowed-fetch utilities for Instagram insights.
// Instagram's total_value metrics don't support time_series, so we make
// multiple API calls with different since/until windows.
//
// Hybrid granularity: daily for the last 14 days, weekly for older data.
// This gives the right density for every frontend range filter:
//   7d  → ~7 daily points
//   14d → ~14 daily points
//   30d → 14 daily + ~2 weekly
//   90d → 14 daily + ~11 weekly

/** Max concurrent requests to avoid hammering the API */
export const BATCH_SIZE = 4;

/** Threshold: days within this range get daily granularity */
const DAILY_THRESHOLD = 14;

export type Window = {
  since: Date;
  until: Date;
  /** Start date string for chart x-axis labels */
  label: string;
  /** Number of days this window spans (1 for daily, 7 for weekly, etc.) */
  spanDays: number;
};

/**
 * Build time windows with hybrid granularity:
 * - Last 14 days → daily (step = 1)
 * - Older than 14 days → weekly (step = 7)
 */
export function buildWindows(days: number): Window[] {
  const now = new Date();
  now.setUTCHours(0, 0, 0, 0);

  const start = new Date(now);
  start.setUTCDate(start.getUTCDate() - days);

  // The boundary between weekly and daily zones
  const dailyBoundary = new Date(now);
  dailyBoundary.setUTCDate(dailyBoundary.getUTCDate() - DAILY_THRESHOLD);

  const windows: Window[] = [];
  const cursor = new Date(start);

  while (cursor < now) {
    // Use weekly step for dates older than the daily threshold,
    // daily step for recent dates
    const inDailyZone = cursor >= dailyBoundary;
    const step = inDailyZone ? 1 : 7;

    const windowEnd = new Date(cursor);
    windowEnd.setUTCDate(windowEnd.getUTCDate() + step);

    // Don't overshoot today or the daily boundary (when in weekly zone)
    if (!inDailyZone && windowEnd > dailyBoundary) {
      windowEnd.setTime(dailyBoundary.getTime());
    }
    if (windowEnd > now) {
      windowEnd.setTime(now.getTime());
    }

    // Calculate actual span in days
    const spanMs = windowEnd.getTime() - cursor.getTime();
    const spanDays = Math.max(1, Math.round(spanMs / (24 * 60 * 60 * 1000)));

    windows.push({
      since: new Date(cursor),
      until: new Date(windowEnd),
      label: cursor.toISOString().split("T")[0],
      spanDays,
    });

    cursor.setTime(windowEnd.getTime());
  }

  return windows;
}

/** Run promises in batches to limit concurrency */
export async function batchAll<T>(
  tasks: (() => Promise<T>)[],
  batchSize: number,
): Promise<T[]> {
  const results: T[] = [];
  for (let i = 0; i < tasks.length; i += batchSize) {
    const batch = tasks.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map((fn) => fn()));
    results.push(...batchResults);
  }
  return results;
}
