"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Flame, Trophy } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function PostingStreak() {
  const streak = useQuery(api.posts.getPostingStreak);

  if (streak === undefined) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Flame className="size-4 text-orange-500" />
            Posting Streak
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Flame className="size-4 text-orange-500" />
          Posting Streak
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current streak */}
        <div className="flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
            <span className="text-xl font-bold tabular-nums">{streak.currentStreak}</span>
          </div>
          <div>
            <p className="text-sm font-semibold">
              {streak.currentStreak === 1 ? "day" : "days"} streak
            </p>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Trophy className="size-3" />
              Best: {streak.bestStreak} {streak.bestStreak === 1 ? "day" : "days"}
            </div>
          </div>
        </div>

        {/* Last 7 days dots */}
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">Last 7 days</p>
          <div className="flex justify-between gap-1">
            {streak.last7Days.map((day) => (
              <div key={day.date} className="flex flex-col items-center gap-1.5">
                <div
                  className={`size-6 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                    day.posted
                      ? "bg-orange-500 text-white"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {day.posted ? "\u2713" : ""}
                </div>
                <span className="text-[10px] text-muted-foreground">{day.dayLabel}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Total posts */}
        <div className="rounded-lg bg-muted/50 px-3 py-2 text-center">
          <p className="text-lg font-bold tabular-nums">{streak.totalPosts}</p>
          <p className="text-[10px] text-muted-foreground">total posts published</p>
        </div>
      </CardContent>
    </Card>
  );
}
