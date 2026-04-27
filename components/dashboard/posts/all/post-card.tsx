"use client";

import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  FaFacebookF,
  FaInstagram,
  FaTiktok,
  FaXTwitter,
  FaThreads,
} from "react-icons/fa6";
import { ImageIcon, FileTextIcon, VideoIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";

const PLATFORM_BADGE: Record<string, { icon: React.ReactNode; bg: string }> = {
  facebook: { icon: <FaFacebookF className="size-2" />, bg: "bg-[#1877F2]" },
  instagram: {
    icon: <FaInstagram className="size-2" />,
    bg: "bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF]",
  },
  tiktok: { icon: <FaTiktok className="size-2" />, bg: "bg-black" },
  twitter: { icon: <FaXTwitter className="size-2" />, bg: "bg-black" },
  threads: { icon: <FaThreads className="size-2" />, bg: "bg-black" },
};

const CONTENT_ICONS: Record<string, React.ReactNode> = {
  feed: <ImageIcon className="size-3" />,
  image: <ImageIcon className="size-3" />,
  text: <FileTextIcon className="size-3" />,
  video: <VideoIcon className="size-3" />,
  reel: <VideoIcon className="size-3" />,
  story: <ImageIcon className="size-3" />,
};

const STATUS_STYLES: Record<string, string> = {
  scheduled: "bg-blue-500 text-white hover:bg-blue-500",
  published: "bg-emerald-600 text-white hover:bg-emerald-600",
  failed: "bg-red-500 text-white hover:bg-red-500",
  cancelled: "bg-gray-400 text-white hover:bg-gray-400",
  draft: "bg-amber-500 text-white hover:bg-amber-500",
  publishing: "bg-blue-400 text-white hover:bg-blue-400",
};

interface Props {
  post: {
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
  };
}

export default function PostCard({ post }: Props) {
  const date = new Date(post.scheduledAt);
  const dateStr = date.toLocaleDateString("en-US", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
  });
  const timeStr = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  const statusLabel = post.status === "published" ? "posted" : post.status;
  const badge = PLATFORM_BADGE[post.platform];

  return (
    <div className="rounded-xl border bg-card overflow-hidden flex flex-col hover:shadow-md transition-shadow">
      {/* Body */}
      <div className="p-4 pb-3 flex flex-col gap-2.5 flex-1">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{dateStr}</span>
          <span>{timeStr}</span>
        </div>

        <Badge
          variant="outline"
          className="w-fit gap-1 text-xs font-normal py-0.5"
        >
          {CONTENT_ICONS[post.contentType]}
          {post.contentType}
        </Badge>

        <p className="text-sm font-semibold line-clamp-2">
          {post.textContent || "No caption"}
        </p>

        {post.mediaUrls.length > 0 && (
          <div className="h-20 w-20 rounded-lg overflow-hidden bg-muted mt-1 relative">
            {post.contentType === "video" || post.contentType === "reel" ? (
              <>
                <video
                  src={post.mediaUrls[0]}
                  className="size-full object-cover"
                  preload="metadata"
                  muted
                  playsInline
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <VideoIcon className="size-5 text-white drop-shadow" />
                </div>
              </>
            ) : (
              <img
                src={post.mediaUrls[0]}
                alt="Media"
                className="size-full object-cover"
              />
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-3 bg-muted/50 border-t">
        {/* Avatar with platform badge — same style as account-selector */}
        <div className="relative w-fit">
          {/* <Avatar className="size-8">
            <AvatarImage
              src={post.account?.profileImageUrl}
              alt={post.account?.displayName}
            />
            <AvatarFallback className="text-xs bg-muted">
              {post.account?.displayName?.charAt(0).toUpperCase() ?? "?"}
            </AvatarFallback>
          </Avatar> */}
          {post.account?.profileImageUrl ? (
            <Image
              src={post.account?.profileImageUrl}
              alt={post.account?.displayName}
              width={20}
              height={20}
              className="size-8 rounded-full object-cover"
            />
          ) : (
            <div className="flex size-8 items-center justify-center rounded-full bg-muted">
              <span className="text-xs text-muted-foreground">
                {post.account?.displayName?.charAt(0).toUpperCase() ?? "?"}
              </span>
            </div>
          )}
          {badge && (
            <span
              className={cn(
                "absolute -bottom-0.5 -right-0.5 flex items-center justify-center",
                "size-4 rounded-full border-2 border-background text-white",
                badge.bg,
              )}
            >
              {badge.icon}
            </span>
          )}
        </div>

        <Badge
          className={cn(
            "text-[11px] px-3 py-0.5 rounded-full",
            STATUS_STYLES[post.status],
          )}
        >
          {statusLabel}
        </Badge>
      </div>
    </div>
  );
}
