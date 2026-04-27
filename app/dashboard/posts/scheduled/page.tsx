"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { PageHeader } from "@/components/dashboard/shared/page-header/page-header";
import PostGrid from "@/components/dashboard/posts/all/post-grid";
import { CalendarClock } from "lucide-react";

export default function ScheduledPage() {
  const posts = useQuery(api.posts.listScheduled);
  const isLoading = posts === undefined;

  return (
    <div className="min-h-screen bg-muted/30">
      <PageHeader title="Scheduled Posts" />
      <div className="p-5 space-y-5 mt-13">
        {/* Count */}
        {!isLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarClock className="size-4" />
            <span>
              {posts.length === 0
                ? "No upcoming posts"
                : `${posts.length} post${posts.length === 1 ? "" : "s"} scheduled`}
            </span>
          </div>
        )}

        <PostGrid posts={posts ?? []} isLoading={isLoading} />
      </div>
    </div>
  );
}
