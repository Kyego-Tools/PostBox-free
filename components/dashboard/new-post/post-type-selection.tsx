"use client";

import React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Type,
  Image,
  Video,
} from "lucide-react";
import {
  FaFacebookF,
  FaXTwitter,
  FaInstagram,
  FaThreads,
  FaTiktok,
} from "react-icons/fa6";

interface PostType {
  id: "text" | "image" | "video";
  label: string;
  icon: React.ReactNode;
  platforms: { icon: React.ReactNode; label: string }[];
}

const platformIcons = {
  facebook: { icon: <FaFacebookF className="size-4" />, label: "Facebook" },
  twitter: { icon: <FaXTwitter className="size-4" />, label: "X / Twitter" },
  instagram: { icon: <FaInstagram className="size-4" />, label: "Instagram" },
  threads: { icon: <FaThreads className="size-4" />, label: "Threads" },
  tiktok: { icon: <FaTiktok className="size-4" />, label: "TikTok" },
};

const postTypes: PostType[] = [
  {
    id: "text",
    label: "Text Post",
    icon: <Type className="size-10 text-muted-foreground/60" strokeWidth={1.5} />,
    platforms: [
      platformIcons.facebook,
      platformIcons.twitter,
      platformIcons.threads,
    ],
  },
  {
    id: "image",
    label: "Image Post",
    icon: <Image className="size-10 text-muted-foreground/60" strokeWidth={1.5} />,
    platforms: [
      platformIcons.facebook,
      platformIcons.twitter,
      platformIcons.threads,
      platformIcons.instagram,
      platformIcons.tiktok,
    ],
  },
  {
    id: "video",
    label: "Video Post",
    icon: <Video className="size-10 text-muted-foreground/60" strokeWidth={1.5} />,
    platforms: [
      platformIcons.facebook,
      platformIcons.twitter,
      platformIcons.threads,
      platformIcons.instagram,
      platformIcons.tiktok,
    ],
  },
];

export default function PostTypeSelection() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const scheduleDate = searchParams.get("scheduleDate");

  const handleSelect = (type: PostType["id"]) => {
    const params = new URLSearchParams({ type });
    if (scheduleDate) params.set("scheduleDate", scheduleDate);
    router.push(`/dashboard/new-post/compose?${params.toString()}`);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">Create a new post</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {postTypes.map((type) => (
          <button
            key={type.id}
            onClick={() => handleSelect(type.id)}
            className="group relative flex flex-col items-center gap-4 rounded-xl border-2 border-dashed border-muted-foreground/20 bg-background p-8 transition-all hover:border-primary/40 hover:bg-primary/5 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {/* Icon */}
            <div className="transition-transform group-hover:scale-110">
              {type.icon}
            </div>

            {/* Label */}
            <span className="text-base font-semibold text-foreground">
              {type.label}
            </span>

            {/* Supported platforms */}
            <div className="flex items-center gap-2 mt-2">
              {type.platforms.map((p, i) => (
                <span
                  key={i}
                  className="text-muted-foreground/50 transition-colors group-hover:text-muted-foreground/70"
                  title={p.label}
                >
                  {p.icon}
                </span>
              ))}
            </div>
          </button>
        ))}
      </div>

      <p className="text-sm text-muted-foreground">
        You can connect more accounts{" "}
        <a
          href="/dashboard/settings/connections"
          className="text-primary underline underline-offset-4 hover:text-primary/80"
        >
          here
        </a>
      </p>
    </div>
  );
}
