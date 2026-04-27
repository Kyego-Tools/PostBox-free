"use client";

import { ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlatformIcon } from "@/components/dashboard/analytics/platform-icon";

// ─── Fake stat cards (mirrors OverviewStats visually) ────────────────────────

const DUMMY_STATS = [
  { label: "Total Followers", value: "24,831", change: 4.2 },
  { label: "Total Views", value: "142,506", change: -1.3 },
  { label: "Avg Engagement", value: "3.8%", change: 0.8 },
];

function DummyStatCards() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {DUMMY_STATS.map((stat) => (
        <Card key={stat.label} className="p-0">
          <CardContent className="px-5 py-5">
            <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
            <p className="mt-2 text-3xl font-bold tabular-nums tracking-tight">
              {stat.value}
            </p>
            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs">
                <span
                  className={`font-semibold ${stat.change > 0 ? "text-emerald-600" : "text-red-500"}`}
                >
                  {stat.change > 0 ? "↑" : "↓"} {Math.abs(stat.change)}%
                </span>
                <span className="text-muted-foreground">vs last month</span>
              </div>
              <ChevronRight className="size-4 text-muted-foreground/40" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Fake chart ───────────────────────────────────────────────────────────────

const BAR_HEIGHTS = [48, 65, 40, 82, 58, 91, 54, 73, 88, 44, 96, 70];

function DummyChart() {
  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">Account Statistics</CardTitle>
          <div className="flex gap-2">
            {["7d", "14d", "30d", "90d"].map((p) => (
              <div
                key={p}
                className={`rounded-md px-2 py-0.5 text-xs ${p === "30d" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
              >
                {p}
              </div>
            ))}
          </div>
        </div>
        <div className="flex gap-4">
          {["Facebook · 12.4K", "Instagram · 8.2K", "Twitter · 4.2K"].map((a) => (
            <span key={a} className="text-xs text-muted-foreground">{a}</span>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex h-48 items-end gap-1.5 rounded-lg bg-muted/20 px-3 pb-3 pt-4">
          {BAR_HEIGHTS.map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-t-sm bg-primary/40"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
        <div className="mt-2 flex justify-between px-1 text-[10px] text-muted-foreground">
          {["Apr 1", "Apr 8", "Apr 15", "Apr 22"].map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Fake top posts ───────────────────────────────────────────────────────────

const DUMMY_POSTS = [
  {
    platform: "instagram",
    text: "Behind the scenes of our latest creative shoot 🎨",
    views: "8,430",
    likes: "891",
    engagement: "6.2%",
  },
  {
    platform: "facebook",
    text: "Excited to share our biggest update yet — meet the new features...",
    views: "14,200",
    likes: "542",
    engagement: "4.8%",
  },
  {
    platform: "twitter",
    text: "Big news coming soon. Stay tuned. 👀",
    views: "3,860",
    likes: "312",
    engagement: "3.1%",
  },
];

function DummyTopPosts() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Top Posts</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {DUMMY_POSTS.map((post, i) => (
          <div
            key={i}
            className="flex items-start gap-3 rounded-lg border p-2.5"
          >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
              <PlatformIcon platform={post.platform} className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium">{post.text}</p>
              <div className="mt-1 flex gap-3 text-[10px] text-muted-foreground">
                <span>{post.views} views</span>
                <span>{post.likes} likes</span>
                <span className="text-emerald-600 font-medium">{post.engagement}</span>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ─── Composed export ──────────────────────────────────────────────────────────

export default function DummyAnalytics() {
  return (
    <div className="space-y-6">
      <DummyStatCards />
      <DummyChart />
      <DummyTopPosts />
    </div>
  );
}
