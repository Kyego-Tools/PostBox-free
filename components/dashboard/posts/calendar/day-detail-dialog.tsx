"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CalendarPost } from "@/hooks/use-calendar";
import {
  FaFacebookF,
  FaInstagram,
  FaTiktok,
  FaXTwitter,
  FaThreads,
} from "react-icons/fa6";
import Image from "next/image";
import { PlatformIcon } from "../../analytics/platform-icon";

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

const STATUS_COLORS: Record<string, string> = {
  scheduled: "border-l-blue-500",
  published: "border-l-emerald-500",
  failed: "border-l-red-500",
  cancelled: "border-l-gray-400",
};

const STATUS_BADGE: Record<string, string> = {
  scheduled: "bg-blue-500 text-white hover:bg-blue-500",
  published: "bg-emerald-600 text-white hover:bg-emerald-600",
  failed: "bg-red-500 text-white hover:bg-red-500",
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date | null;
  posts: CalendarPost[];
}

export default function DayDetailDialog({
  open,
  onOpenChange,
  date,
  posts,
}: Props) {
  if (!date) return null;

  const dateLabel = date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const sorted = [...posts].sort((a, b) => a.scheduledAt - b.scheduledAt);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <CalendarIcon className="size-4" />
            {dateLabel}
          </DialogTitle>
        </DialogHeader>

        {sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No posts for this day
          </p>
        ) : (
          <div className="space-y-3">
            {sorted.map((post) => (
              <PostRow key={post._id} post={post} />
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function PostRow({ post }: { post: CalendarPost }) {
  const time = new Date(post.scheduledAt).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  const badge = PLATFORM_BADGE[post.platform];
  const statusLabel = post.status === "published" ? "posted" : post.status;

  return (
    <div
      className={cn(
        "border rounded-lg p-3 border-l-4 flex items-start gap-3",
        STATUS_COLORS[post.status],
      )}
    >
      {/* Media preview */}
      {post.mediaUrls.length > 0 && (
        <div className="size-12 rounded-md overflow-hidden bg-muted shrink-0">
          <img
            src={post.mediaUrls[0]}
            alt=""
            className="size-full object-cover"
          />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          {/* Account avatar with platform badge */}
          <div className="relative">
            {/* <Avatar className="size-5">
              <AvatarImage src={post.account?.profileImageUrl} />
              <AvatarFallback className="text-[8px]">
                {post.account?.displayName?.charAt(0) ?? "?"}
              </AvatarFallback>
            </Avatar> */}
            {post.account?.profileImageUrl ? (
              <Image
                src={post.account.profileImageUrl}
                alt={post.account.displayName}
                width={20}
                height={20}
                className="size-5 rounded-full object-cover"
              />
            ) : (
              <PlatformIcon
                platform={post.account?.platform || post.platform}
                className="size-4"
              />
            )}
            {badge && (
              <span
                className={cn(
                  "absolute -bottom-0.5 -right-0.5 flex items-center justify-center size-3 rounded-full border border-background text-white",
                  badge.bg,
                )}
              >
                {badge.icon}
              </span>
            )}
          </div>
          <span className="text-xs font-medium">{time}</span>
          <Badge
            className={cn(
              "text-[10px] px-2 py-0 ml-auto rounded-full",
              STATUS_BADGE[post.status],
            )}
          >
            {statusLabel}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2">
          {post.textContent || "No caption"}
        </p>
      </div>
    </div>
  );
}
