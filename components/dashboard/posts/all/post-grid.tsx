"use client";

import PostCard from "./post-card";

interface Post {
  _id: string;
  platform: string;
  contentType: string;
  textContent?: string;
  scheduledAt: number;
  status: string;
  mediaUrls: string[];
  account: {
    platform: string;
    displayName: string;
    profileImageUrl?: string;
  } | null;
}

interface Props {
  posts: Post[];
  isLoading: boolean;
}

export default function PostGrid({ posts, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-52 rounded-xl bg-muted animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <p className="text-sm">No posts found</p>
        <p className="text-xs mt-1">
          Create a new post or adjust your filters
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {posts.map((post) => (
        <PostCard key={post._id} post={post} />
      ))}
    </div>
  );
}
