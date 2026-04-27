"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import PostComposer from "@/components/dashboard/new-post/compose/post-composer";
import { PageHeader } from "@/components/dashboard/shared/page-header/page-header";
import type { PostType } from "@/hooks/use-post-composer";

const VALID_TYPES = new Set(["text", "image", "video"]);

function ComposeContent() {
  const searchParams = useSearchParams();
  const type = searchParams.get("type") || "text";
  const scheduleDateParam = searchParams.get("scheduleDate");
  const draftGroupId = searchParams.get("draft");

  const postType: PostType = VALID_TYPES.has(type)
    ? (type as PostType)
    : "text";

  const initialScheduleDate = scheduleDateParam
    ? new Date(scheduleDateParam + "T12:00:00")
    : undefined;

  // Load draft data if editing a draft
  const draftData = useQuery(
    api.posts.getDraftGroup,
    draftGroupId ? { draftGroupId } : "skip",
  );

  // Wait for draft data to load before rendering composer
  if (draftGroupId && draftData === undefined) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="h-40 bg-muted animate-pulse rounded-xl" />
      </div>
    );
  }

  return (
    <PostComposer
      postType={postType}
      initialScheduleDate={initialScheduleDate}
      draftData={draftData ?? undefined}
    />
  );
}

export default function ComposePage() {
  return (
    <div className="min-h-screen bg-muted/30">
      <PageHeader title="Create Post" />
      <div className="p-5 mt-13">
        <Suspense
          fallback={
            <div className="space-y-4">
              <div className="h-8 w-48 bg-muted animate-pulse rounded" />
              <div className="h-40 bg-muted animate-pulse rounded-xl" />
            </div>
          }
        >
          <ComposeContent />
        </Suspense>
      </div>
    </div>
  );
}
