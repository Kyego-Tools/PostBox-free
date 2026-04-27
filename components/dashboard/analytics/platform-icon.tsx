import {
  FaFacebookF,
  FaInstagram,
  FaTiktok,
  FaXTwitter,
  FaThreads,
} from "react-icons/fa6";

const PLATFORMS: Record<string, { icon: React.ElementType; color: string; name: string; bar: string }> = {
  facebook: { icon: FaFacebookF, color: "text-blue-600", name: "Facebook", bar: "#2563eb" },
  instagram: { icon: FaInstagram, color: "text-pink-600", name: "Instagram", bar: "#e11d48" },
  tiktok: { icon: FaTiktok, color: "text-foreground", name: "TikTok", bar: "#000000" },
  twitter: { icon: FaXTwitter, color: "text-foreground", name: "X", bar: "#000000" },
  threads: { icon: FaThreads, color: "text-foreground", name: "Threads", bar: "#000000" },
};

export function PlatformIcon({ platform, className = "size-4" }: { platform: string; className?: string }) {
  const config = PLATFORMS[platform];
  if (!config) return null;
  const Icon = config.icon;
  return <Icon className={`${className} ${config.color}`} />;
}

export function getPlatformName(platform: string) {
  return PLATFORMS[platform]?.name || platform;
}

export function getPlatformBarColor(platform: string) {
  return PLATFORMS[platform]?.bar || "#6b7280";
}
