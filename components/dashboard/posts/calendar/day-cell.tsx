"use client";

import { useRouter } from "next/navigation";
import {
  Plus,
  Check,
  Clock,
  AlertCircle,
  CheckCircle,
  CheckCircle2,
  CircleCheck,
} from "lucide-react";
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
import { IconCheckFilled, IconCircleCheck } from "@tabler/icons-react";

const PLATFORM_ICON: Record<string, React.ReactNode> = {
  facebook: <FaFacebookF className="size-2.5 shrink-0" />,
  instagram: <FaInstagram className="size-2.5 shrink-0" />,
  tiktok: <FaTiktok className="size-2.5 shrink-0" />,
  twitter: <FaXTwitter className="size-2.5 shrink-0" />,
  threads: <FaThreads className="size-2.5 shrink-0" />,
};

const PLATFORM_BG: Record<string, string> = {
  facebook: "bg-[#1877F2]",
  instagram: "bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF]",
  tiktok: "bg-black",
  twitter: "bg-black",
  threads: "bg-black",
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  published: <IconCircleCheck className="size-5" />,
  scheduled: <Clock className="size-5" />,
  failed: <AlertCircle className="size-5" />,
};

const STATUS_ICON_COLOR: Record<string, string> = {
  published: "text-green-600",
  scheduled: "text-blue-500",
  failed: "text-red-500",
  cancelled: "text-gray-400",
  draft: "text-amber-500",
  publishing: "text-blue-400",
};

const STATUS_BG_COLOR: Record<string, string> = {
  published: "bg-green-100 border border-green-500",
  scheduled: "bg-blue-100 border border-blue-500",
  failed: "bg-red-100 border border-red-500",
  cancelled: "bg-gray-100 border border-gray-400",
  draft: "bg-amber-100 border border-amber-500",
  publishing: "bg-blue-200 border border-blue-400",
};

interface Props {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  posts: CalendarPost[];
  onClick: () => void;
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function toDateParam(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function DayCell({
  date,
  isCurrentMonth,
  isToday,
  posts,
  onClick,
}: Props) {
  const router = useRouter();
  const maxVisible = 5;
  const visible = posts.slice(0, maxVisible);
  const hiddenCount = posts.length - maxVisible;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isPast = date < today;

  const handleAddClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isPast) return;
    router.push(`/dashboard/new-post?scheduleDate=${toDateParam(date)}`);
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        "group/cell border-r border-b cursor-pointer transition-colors hover:bg-muted/40 flex flex-col",
        !isCurrentMonth && "bg-muted/20 opacity-50",
        isToday && "bg-primary/5",
      )}
    >
      {/* Header: date number + post count */}
      <div className="flex items-center justify-between px-2 pt-1.5 pb-1">
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "text-sm font-medium size-7 flex items-center justify-center rounded-full",
              isToday && "bg-primary text-primary-foreground",
            )}
          >
            {date.getDate()}
          </span>
          {/* Add button */}
          {!isPast && (
            <button
              onClick={handleAddClick}
              className="size-5 rounded-full flex items-center justify-center opacity-0 group-hover/cell:opacity-100 transition-opacity bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground"
              title="Create post for this date"
            >
              <Plus className="size-3" />
            </button>
          )}
        </div>

        {posts.length > 0 && (
          <span className="text-[11px] font-medium text-muted-foreground bg-muted rounded-full size-5 flex items-center justify-center">
            {posts.length}
          </span>
        )}
      </div>

      {/* Post entries */}
      <div className="flex flex-col gap-[3px] px-1.5 pb-1.5 flex-1">
        {visible.map((post) => (
          <PostEntry key={post._id} post={post} />
        ))}
        {hiddenCount > 0 && (
          <span className="text-[10px] text-muted-foreground pl-1 font-medium">
            +{hiddenCount} more
          </span>
        )}
      </div>
    </div>
  );
}

function PostEntry({ post }: { post: CalendarPost }) {
  const time = formatTime(post.scheduledAt);

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-md px-1.5 py-1 hover:bg-muted transition-colors min-w-0",
        STATUS_BG_COLOR[post.status] ?? "bg-blue-500/80",
      )}
      title={post.textContent || "No caption"}
    >
      {/* Profile image or platform icon */}
      {post.account?.profileImageUrl ? (
        <div className="relative shrink-0">
          <Image
            src={post.account?.profileImageUrl}
            alt={post.account?.displayName}
            width={20}
            height={20}
            className="size-5 rounded-full object-cover"
          />
          {/* Platform badge overlay */}
          <span
            className={cn(
              "absolute -bottom-0.5 -right-0.5 flex items-center justify-center size-3 rounded-full text-white border border-background",
              PLATFORM_BG[post.platform],
            )}
          >
            {PLATFORM_ICON[post.platform]}
          </span>
        </div>
      ) : (
        <span
          className={cn(
            "flex items-center justify-center size-5 rounded-sm text-white shrink-0",
            PLATFORM_BG[post.platform],
          )}
        >
          {PLATFORM_ICON[post.platform]}
        </span>
      )}

      {/* Time */}
      <span
        className={cn(
          `text-[11px] font-bold tabular-nums truncate ${STATUS_ICON_COLOR}`,
          STATUS_ICON_COLOR[post.status] ?? "text-gray-500",
        )}
      >
        {time}
      </span>

      {/* Status icon */}
      <span className={cn("ml-auto shrink-0", STATUS_ICON_COLOR[post.status])}>
        {STATUS_ICON[post.status] ?? STATUS_ICON.scheduled}
      </span>
    </div>
  );
}
