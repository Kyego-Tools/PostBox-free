"use client"

import { useQuery, useMutation } from "convex/react"
import { useRouter } from "next/navigation"
import { api } from "@/convex/_generated/api"
import { PageHeader } from "@/components/dashboard/shared/page-header/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  FaFacebookF,
  FaInstagram,
  FaTiktok,
  FaXTwitter,
  FaThreads,
} from "react-icons/fa6"
import {
  FileEdit,
  Trash2,
  CalendarClock,
  ImageIcon,
  FileTextIcon,
  VideoIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import Image from "next/image"
import { PlatformIcon } from "@/components/dashboard/analytics/platform-icon"

const PLATFORM_BADGE: Record<string, { icon: React.ReactNode; bg: string }> = {
  facebook: { icon: <FaFacebookF className="size-2" />, bg: "bg-[#1877F2]" },
  instagram: {
    icon: <FaInstagram className="size-2" />,
    bg: "bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF]",
  },
  tiktok: { icon: <FaTiktok className="size-2" />, bg: "bg-black" },
  twitter: { icon: <FaXTwitter className="size-2" />, bg: "bg-black" },
  threads: { icon: <FaThreads className="size-2" />, bg: "bg-black" },
}

const CONTENT_ICONS: Record<string, React.ReactNode> = {
  feed: <ImageIcon className="size-3" />,
  text: <FileTextIcon className="size-3" />,
  video: <VideoIcon className="size-3" />,
  reel: <VideoIcon className="size-3" />,
  story: <ImageIcon className="size-3" />,
}

export default function DraftsPage() {
  const drafts = useQuery(api.posts.listDrafts)
  const deleteDraft = useMutation(api.scheduledPosts.deleteDraft)
  const router = useRouter()
  const isLoading = drafts === undefined

  const handleEdit = (draft: NonNullable<typeof drafts>[number]) => {
    // Map contentType back to postType for the composer
    const typeMap: Record<string, string> = {
      feed: "image",
      text: "text",
      video: "video",
      reel: "video",
      story: "image",
    }
    const postType = typeMap[draft.contentType] ?? "text"
    router.push(
      `/dashboard/new-post/compose?type=${postType}&draft=${draft.draftGroupId}`
    )
  }

  const handleDelete = async (draftGroupId: string) => {
    await deleteDraft({ draftGroupId })
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <PageHeader title="Drafts" />
      <div className="mt-13 space-y-5 p-5">
        {/* Count */}
        {!isLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileEdit className="size-4" />
            <span>
              {drafts.length === 0
                ? "No drafts"
                : `${drafts.length} draft${drafts.length === 1 ? "" : "s"}`}
            </span>
          </div>
        )}

        {/* Loading skeleton */}
        {isLoading && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-52 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && drafts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <p className="text-sm">No drafts yet</p>
            <p className="mt-1 text-xs">
              Save a post as draft from the composer to see it here
            </p>
          </div>
        )}

        {/* Draft cards */}
        {!isLoading && drafts.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {drafts.map((draft) => {
              const hasSchedule = draft.scheduledAt > 0
              const schedulePassed =
                // eslint-disable-next-line react-hooks/purity
                hasSchedule && draft.scheduledAt < Date.now()

              return (
                <div
                  key={draft.draftGroupId}
                  className="flex flex-col overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-md"
                >
                  {/* Body */}
                  <div className="flex flex-1 flex-col gap-2.5 p-4 pb-3">
                    <div className="flex items-center justify-between">
                      <Badge
                        variant="outline"
                        className="gap-1 py-0.5 text-xs font-normal"
                      >
                        {CONTENT_ICONS[draft.contentType]}
                        {draft.contentType}
                      </Badge>
                      <Badge className="rounded-full bg-amber-500 px-3 py-0.5 text-[11px] text-white hover:bg-amber-500">
                        draft
                      </Badge>
                    </div>

                    <p className="line-clamp-3 text-sm font-semibold">
                      {draft.textContent || "No caption"}
                    </p>

                    {draft.mediaUrls.length > 0 && (
                      <div className="mt-1 h-20 w-20 overflow-hidden rounded-lg bg-muted">
                        <img
                          src={draft.mediaUrls[0]}
                          alt="Media"
                          className="size-full object-cover"
                        />
                      </div>
                    )}

                    {/* Schedule info */}
                    {hasSchedule && (
                      <div
                        className={cn(
                          "mt-1 flex items-center gap-1.5 text-xs",
                          schedulePassed
                            ? "text-red-500"
                            : "text-muted-foreground"
                        )}
                      >
                        <CalendarClock className="size-3" />
                        <span>
                          {schedulePassed ? "Date passed: " : ""}
                          {new Date(draft.scheduledAt).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between border-t bg-muted/50 px-4 py-3">
                    {/* Account avatars */}
                    <div className="flex -space-x-2">
                      {draft.accounts.map((acct) => {
                        const badge = PLATFORM_BADGE[acct.platform]
                        return (
                          <div key={acct._id} className="relative">
                            {/* <Avatar className="size-7 border-2 border-background">
                              <AvatarImage
                                src={acct.profileImageUrl}
                                alt={acct.displayName}
                              />
                              <AvatarFallback className="text-[10px] bg-muted">
                                {acct.displayName?.charAt(0).toUpperCase() ??
                                  "?"}
                              </AvatarFallback>
                            </Avatar> */}
                            {acct.profileImageUrl ? (
                              <Image
                                src={acct.profileImageUrl}
                                alt={acct.displayName}
                                width={20}
                                height={20}
                                className="size-7 rounded-full object-cover"
                              />
                            ) : (
                              <PlatformIcon
                                platform={acct.platform}
                                className="size-4"
                              />
                            )}

                            {badge && (
                              <span
                                className={cn(
                                  "absolute -right-0.5 -bottom-0.5 flex items-center justify-center",
                                  "size-3.5 rounded-full border-2 border-background text-white",
                                  badge.bg
                                )}
                              >
                                {badge.icon}
                              </span>
                            )}
                          </div>
                        )
                      })}
                      {draft.accounts.length === 0 && (
                        <span className="text-xs text-muted-foreground">
                          No accounts
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={() => handleEdit(draft)}
                      >
                        <FileEdit className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-red-500 hover:bg-red-50 hover:text-red-600"
                        onClick={() => handleDelete(draft.draftGroupId)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
