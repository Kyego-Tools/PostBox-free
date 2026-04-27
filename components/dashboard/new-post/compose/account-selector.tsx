"use client"

import { Id } from "@/convex/_generated/dataModel"
import {
  FaFacebookF,
  FaXTwitter,
  FaInstagram,
  FaThreads,
  FaTiktok,
} from "react-icons/fa6"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { LayoutGrid, Film, Circle, ChevronDown, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import Image from "next/image"
import type { PostType } from "@/hooks/use-post-composer"

const platformIcon: Record<string, React.ReactNode> = {
  facebook: <FaFacebookF className="size-2.5" />,
  twitter: <FaXTwitter className="size-2.5" />,
  instagram: <FaInstagram className="size-2.5" />,
  threads: <FaThreads className="size-2.5" />,
  tiktok: <FaTiktok className="size-2.5" />,
}

export type InstagramContentType = "feed" | "reel" | "story"
export type FacebookContentType = "feed" | "story"

const IG_TYPES: {
  value: InstagramContentType
  label: string
  icon: React.ElementType
}[] = [
  { value: "feed", label: "Feed", icon: LayoutGrid },
  { value: "reel", label: "Reels", icon: Film },
  { value: "story", label: "Story", icon: Circle },
]

const FB_TYPES: {
  value: FacebookContentType
  label: string
  icon: React.ElementType
}[] = [
  { value: "feed", label: "Feed", icon: LayoutGrid },
  { value: "story", label: "Story", icon: Circle },
]

interface Account {
  _id: Id<"socialAccounts">
  platform: string
  displayName: string
  profileImageUrl?: string
}

interface Props {
  accounts: Account[]
  selectedIds: Set<Id<"socialAccounts">>
  onToggle: (id: Id<"socialAccounts">) => void
  isLoading: boolean
  postType: PostType
  instagramContentTypes: Record<string, InstagramContentType>
  onInstagramContentTypeChange: (
    accountId: string,
    type: InstagramContentType
  ) => void
  facebookContentTypes: Record<string, FacebookContentType>
  onFacebookContentTypeChange: (
    accountId: string,
    type: FacebookContentType
  ) => void
}

function TypeDropdown<T extends string>({
  current,
  options,
  onChange,
}: {
  current: T
  options: { value: T; label: string; icon: React.ElementType }[]
  onChange: (v: T) => void
}) {
  const currentOpt = options.find((o) => o.value === current) ?? options[0]
  const CurrentIcon = currentOpt.icon
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-1 rounded-full border bg-background px-2 py-0.5 text-[10px] font-medium shadow-sm transition-colors hover:bg-muted focus:outline-none">
          <CurrentIcon className="size-2.5 shrink-0" />
          <span>{currentOpt.label}</span>
          <ChevronDown className="size-2.5 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="min-w-[96px] p-1">
        {options.map(({ value, label, icon: Icon }) => (
          <DropdownMenuItem
            key={value}
            onClick={() => onChange(value)}
            className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs"
          >
            <Icon className="size-3.5 shrink-0 text-muted-foreground" />
            <span>{label}</span>
            {current === value && (
              <Check className="ml-auto size-3 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default function AccountSelector({
  accounts,
  selectedIds,
  onToggle,
  isLoading,
  postType,
  instagramContentTypes,
  onInstagramContentTypeChange,
  facebookContentTypes,
  onFacebookContentTypeChange,
}: Props) {
  if (isLoading) {
    return (
      <div className="flex gap-2">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="size-10 animate-pulse rounded-full bg-muted"
          />
        ))}
      </div>
    )
  }

  if (accounts.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No accounts available.{" "}
        <a
          href="/dashboard/settings/connections"
          className="text-primary underline"
        >
          Connect one
        </a>
      </p>
    )
  }

  // Instagram: feed + story for images, all three for video
  const igAvailableTypes =
    postType === "video" ? IG_TYPES : IG_TYPES.filter((t) => t.value !== "reel")

  return (
    <div className="flex flex-wrap items-start gap-3">
      {accounts.map((account) => {
        const selected = selectedIds.has(account._id)
        const isInstagram = account.platform === "instagram"
        const isFacebook = account.platform === "facebook"

        return (
          <div key={account._id} className="flex flex-col items-center gap-2">
            {/* Avatar */}
            <button
              onClick={() => onToggle(account._id)}
              title={`${account.displayName} (${account.platform})`}
              className={cn(
                "relative rounded-full ring-2 ring-offset-2 transition-all",
                selected
                  ? "scale-105 ring-primary"
                  : "opacity-50 ring-transparent grayscale hover:opacity-80 hover:grayscale-0"
              )}
            >
              {account.profileImageUrl ? (
                <Image
                  src={account.profileImageUrl}
                  alt={account.displayName}
                  width={20}
                  height={20}
                  className="size-10 rounded-full object-cover"
                />
              ) : (
                <div className="flex size-8 items-center justify-center rounded-full bg-muted">
                  <span className="text-xs text-muted-foreground">
                    {account.displayName?.charAt(0).toUpperCase() ?? "?"}
                  </span>
                </div>
              )}
              <span
                className={cn(
                  "absolute -right-0.5 -bottom-0.5 flex size-4 items-center justify-center rounded-full border-2 border-background",
                  selected
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {platformIcon[account.platform]}
              </span>
            </button>

            {/* Instagram type dropdown */}
            {isInstagram && selected && (
              <TypeDropdown
                current={instagramContentTypes[account._id] ?? "feed"}
                options={igAvailableTypes}
                onChange={(v) => onInstagramContentTypeChange(account._id, v)}
              />
            )}

            {/* Facebook type dropdown — Feed or Story, no Reels */}
            {isFacebook && selected && postType !== "text" && (
              <TypeDropdown
                current={facebookContentTypes[account._id] ?? "feed"}
                options={FB_TYPES}
                onChange={(v) => onFacebookContentTypeChange(account._id, v)}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
