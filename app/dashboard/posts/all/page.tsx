"use client";

import { PageHeader } from "@/components/dashboard/shared/page-header/page-header";
import PostFilters from "@/components/dashboard/posts/all/post-filters";
import PostGrid from "@/components/dashboard/posts/all/post-grid";
import { useAllPosts } from "@/hooks/use-all-posts";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function AllPostsPage() {
  const {
    posts,
    isLoading,
    totalCount,
    sort,
    setSort,
    platform,
    setPlatform,
    timeRange,
    setTimeRange,
  } = useAllPosts();

  return (
    <div className="min-h-screen bg-muted/30">
      <PageHeader title="All Posts" />

      <div className="p-5 space-y-5 mt-13">
        {/* Toolbar */}
        <div className="flex items-center justify-between">
          <PostFilters
            sort={sort}
            onSortChange={setSort}
            platform={platform}
            onPlatformChange={setPlatform}
            timeRange={timeRange}
            onTimeRangeChange={setTimeRange}
          />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" className="size-9">
                <RefreshCw className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Refresh</TooltipContent>
          </Tooltip>
        </div>

        {/* Post grid */}
        <PostGrid posts={posts} isLoading={isLoading} />

        {/* Count */}
        {!isLoading && totalCount > 0 && (
          <p className="text-xs text-muted-foreground text-center">
            Showing {posts.length} of {totalCount} posts
          </p>
        )}
      </div>
    </div>
  );
}
