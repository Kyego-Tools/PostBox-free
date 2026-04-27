import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Clean up expired OAuth states every hour
crons.interval("oauth-state-cleanup", { hours: 1 }, internal.oauthStates.cleanup);

// Check for expiring tokens every 30 minutes and refresh them proactively.
// Short-lived tokens (X/TikTok, ~2 h) use a 15-min buffer; long-lived tokens
// (IG/Threads, 60 d) use a 7-day buffer. See PLATFORM_REFRESH_BUFFER_MS in
// tokenRefresh.ts. Inline refresh-before-publish is the belt-and-suspenders
// safety net on top of this cron.
crons.interval(
  "token-refresh",
  { minutes: 30 },
  internal.tokenRefresh.findAndRefreshExpiring
);

export default crons;
