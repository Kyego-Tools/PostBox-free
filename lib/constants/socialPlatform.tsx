import type { ReactNode } from "react";
import {
  IconBrandBluesky,
  IconBrandFacebook,
  IconBrandInstagram,
  IconBrandLinkedin,
  IconBrandPinterest,
  IconBrandThreads,
  IconBrandTiktok,
  IconBrandX,
  IconBrandYoutube,
} from "@tabler/icons-react";
import { SocialPlatform } from "../types/socialPlatform";

type PlatformConfig = {
  name: string;
  icon: ReactNode;
  color: string;
  enabled: boolean;
};

export const PLATFORM_CONFIG: Record<SocialPlatform, PlatformConfig> = {
  facebook: {
    name: "Facebook",
    icon: <IconBrandFacebook className="size-6" />,
    color: "text-blue-600",
    enabled: true,
  },
  instagram: {
    name: "Instagram",
    icon: <IconBrandInstagram className="size-6" />,
    color: "text-pink-600",
    enabled: true,
  },
  tiktok: {
    name: "TikTok",
    icon: <IconBrandTiktok className="size-6" />,
    color: "text-foreground",
    enabled: true,
  },
  threads: {
    name: "Threads",
    icon: <IconBrandThreads className="size-6" />,
    color: "text-foreground",
    enabled: true,
  },
  twitter: {
    name: "X",
    icon: <IconBrandX className="size-6" />,
    color: "text-foreground",
    enabled: true,
  },
  youtube: {
    name: "YouTube",
    icon: <IconBrandYoutube className="size-6" />,
    color: "text-red-600",
    enabled: false, // Coming soon
  },
  linkedin: {
    name: "LinkedIn",
    icon: <IconBrandLinkedin className="size-6" />,
    color: "text-blue-700",
    enabled: false, // Coming soon
  },
  bluesky: {
    name: "Bluesky",
    icon: <IconBrandBluesky className="size-6" />,
    color: "text-sky-500",
    enabled: false, // Coming soon
  },
  pinterest: {
    name: "Pinterest",
    icon: <IconBrandPinterest className="size-6" />,
    color: "text-red-600",
    enabled: false, // Coming soon
  },
};
