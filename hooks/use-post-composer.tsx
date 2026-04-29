"use client"

import { useState, useCallback, useMemo } from "react"
import { useQuery, useAction, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import { toast } from "sonner"
import {
  PostingToast,
  BATCH_TOAST_ID,
} from "@/components/dashboard/shared/posting-toast"

export type PostType = "text" | "image" | "video"
export type MediaFile = { file: File; preview: string; id: string }
export type ExistingMedia = {
  mediaId: string
  url: string
  id: string
  isVideo: boolean
}

export type DraftData = {
  draftGroupId: string
  accountIds: string[]
  contentType: string
  textContent?: string
  scheduledAt: number
  timezone: string
  mediaIds?: string[]
  mediaUrls: string[]
}

const PLATFORM_SUPPORT: Record<PostType, string[]> = {
  text: ["facebook", "twitter", "threads"],
  image: ["facebook", "twitter", "threads", "instagram", "tiktok"],
  video: ["facebook", "twitter", "threads", "instagram", "tiktok"],
}

export const CHAR_LIMITS: Record<string, number> = {
  facebook: 63206,
  twitter: 280,
  threads: 500,
  instagram: 2200,
  tiktok: 2200,
}

export type InstagramContentType = "feed" | "reel" | "story"
export type FacebookContentType = "feed" | "story"

function resolveContentType(
  postType: PostType,
  platform: string,
  accountId: string,
  igTypes: Record<string, InstagramContentType>,
  fbTypes: Record<string, FacebookContentType>
): "feed" | "story" | "reel" | "video" | "text" {
  if (platform === "instagram") {
    const igType = igTypes[accountId] ?? "feed"
    if (igType === "reel") return "reel"
    if (igType === "story") return "story"
  }
  if (platform === "facebook" && postType !== "text") {
    const fbType = fbTypes[accountId] ?? "feed"
    if (fbType === "story") return "story"
  }
  return postType === "text" ? "text" : postType === "image" ? "feed" : "video"
}

export function usePostComposer(
  postType: PostType,
  initialScheduleDate?: Date,
  editDraftGroupId?: string,
  draftData?: DraftData,
  instagramContentTypes: Record<string, InstagramContentType> = {},
  facebookContentTypes: Record<string, FacebookContentType> = {}
) {
  const allAccounts = useQuery(api.socialAccounts.listWithHealth)
  const postNow = useAction(api.publishing.postNow)
  const schedulePost = useMutation(api.scheduledPosts.create)
  const saveDraftMutation = useMutation(api.scheduledPosts.saveDraft)
  const generateUploadUrl = useMutation(api.media.generateUploadUrl)
  const saveFile = useMutation(api.media.saveFile)

  const accounts = useMemo(() => {
    if (!allAccounts) return []
    return allAccounts.filter((a) =>
      PLATFORM_SUPPORT[postType].includes(a.platform)
    )
  }, [allAccounts, postType])

  // Pre-fill from draft data if editing a draft
  const draftScheduleDate =
    draftData?.scheduledAt && draftData.scheduledAt > 0
      ? new Date(draftData.scheduledAt)
      : undefined
  const draftScheduleTime = draftScheduleDate
    ? `${String(draftScheduleDate.getHours()).padStart(2, "0")}:${String(draftScheduleDate.getMinutes()).padStart(2, "0")}`
    : "12:00"

  const [selectedAccountIds, setSelectedAccountIds] = useState<
    Set<Id<"socialAccounts">>
  >(() => new Set((draftData?.accountIds ?? []) as Id<"socialAccounts">[]))
  const [caption, setCaption] = useState(draftData?.textContent ?? "")
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([])
  const [existingMedia, setExistingMedia] = useState<ExistingMedia[]>(() => {
    if (!draftData?.mediaIds?.length || !draftData?.mediaUrls?.length) return []
    return draftData.mediaIds.map((mediaId, i) => ({
      mediaId,
      url: draftData.mediaUrls[i] ?? "",
      id: `existing_${mediaId}`,
      isVideo:
        (draftData.mediaUrls[i] ?? "").includes("video") ||
        draftData.contentType === "video",
    }))
  })
  const [isScheduled, setIsScheduled] = useState(
    !!draftScheduleDate || !!initialScheduleDate
  )
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(
    draftScheduleDate ?? initialScheduleDate
  )
  const [scheduledTime, setScheduledTime] = useState(
    draftScheduleDate ? draftScheduleTime : "12:00"
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSavingDraft, setIsSavingDraft] = useState(false)

  const hasSelectedAccounts = selectedAccountIds.size > 0
  const selectedAccounts = useMemo(
    () => accounts.filter((a) => selectedAccountIds.has(a._id)),
    [accounts, selectedAccountIds]
  )
  const maxChars = useMemo(() => {
    if (selectedAccounts.length === 0) return 2200
    return Math.min(
      ...selectedAccounts.map((a) => CHAR_LIMITS[a.platform] ?? 2200)
    )
  }, [selectedAccounts])

  const toggleAccount = useCallback((id: Id<"socialAccounts">) => {
    setSelectedAccountIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  const addMedia = useCallback((files: File[]) => {
    setMediaFiles((prev) => [
      ...prev,
      ...files.map((file) => ({
        file,
        preview: URL.createObjectURL(file),
        id: crypto.randomUUID(),
      })),
    ])
  }, [])

  const removeMedia = useCallback((id: string) => {
    if (id.startsWith("existing_")) {
      setExistingMedia((prev) => prev.filter((m) => m.id !== id))
      return
    }
    setMediaFiles((prev) => {
      const item = prev.find((m) => m.id === id)
      if (item) URL.revokeObjectURL(item.preview)
      return prev.filter((m) => m.id !== id)
    })
  }, [])

  // Upload local files to Convex storage, return media IDs (existing + new)
  const uploadMedia = useCallback(async (): Promise<Id<"mediaFiles">[]> => {
    const ids: Id<"mediaFiles">[] = existingMedia.map(
      (m) => m.mediaId as Id<"mediaFiles">
    )
    for (const mf of mediaFiles) {
      const url = await generateUploadUrl()
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": mf.file.type },
        body: mf.file,
      })
      const { storageId } = (await res.json()) as { storageId: Id<"_storage"> }
      const mediaId = await saveFile({
        storageId,
        fileName: mf.file.name,
        mimeType: mf.file.type,
        sizeBytes: mf.file.size,
        mediaType: mf.file.type.startsWith("video") ? "video" : "image",
      })
      ids.push(mediaId)
    }
    return ids
  }, [existingMedia, mediaFiles, generateUploadUrl, saveFile])

  // Submit: post now or schedule
  const submit = useCallback(async () => {
    if (isSubmitting) return

    setIsSubmitting(true)

    try {
      const mediaIds =
        mediaFiles.length > 0 || existingMedia.length > 0
          ? await uploadMedia()
          : undefined
      const accountIds = Array.from(selectedAccountIds)

      if (isScheduled && scheduledDate) {
        const [h, m] = scheduledTime.split(":").map(Number)
        const at = new Date(scheduledDate)
        at.setHours(h, m, 0, 0)

        for (const accountId of accountIds) {
          const account = accounts.find((a) => a._id === accountId)
          if (!account) continue
          await schedulePost({
            socialAccountId: accountId,
            platform: account.platform as
              | "facebook"
              | "instagram"
              | "tiktok"
              | "twitter"
              | "threads",
            contentType: resolveContentType(
              postType,
              account.platform,
              accountId as string,
              instagramContentTypes,
              facebookContentTypes
            ),
            textContent: caption || undefined,
            mediaIds,
            scheduledAt: at.getTime(),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          })
        }

        toast.success(
          `Scheduled for ${at.toLocaleString().replace(/:\d{2}$/, "")}`
        )
      } else {
        // Build per-account content types so the server routes each platform correctly
        const perAccountContentTypes: Record<string, string> = {}
        const submittedPlatforms: string[] = []
        for (const accountId of accountIds) {
          const account = accounts.find((a) => a._id === accountId)
          if (!account) continue
          perAccountContentTypes[accountId] = resolveContentType(
            postType,
            account.platform,
            accountId as string,
            instagramContentTypes,
            facebookContentTypes
          )
          submittedPlatforms.push(account.platform)
        }

        // Show toast immediately — reactive query may miss fast completions
        toast.loading(
          <PostingToast platforms={[...new Set(submittedPlatforms)]} />,
          {
            id: BATCH_TOAST_ID,
            duration: Infinity,
          }
        )

        await postNow({
          accountIds,
          contentType: postType,
          perAccountContentTypes,
          caption: caption || undefined,
          mediaIds,
        })
      }
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setIsSubmitting(false)
    }
  }, [
    isSubmitting,
    mediaFiles,
    existingMedia,
    selectedAccountIds,
    isScheduled,
    scheduledDate,
    scheduledTime,
    accounts,
    caption,
    postType,
    instagramContentTypes,
    facebookContentTypes,
    uploadMedia,
    schedulePost,
    postNow,
  ])

  const hasMedia = mediaFiles.length > 0 || existingMedia.length > 0
  const canPost = hasSelectedAccounts && (caption.trim().length > 0 || hasMedia)
  const canSaveDraft = caption.trim().length > 0 || hasMedia

  const saveDraft = useCallback(async () => {
    if (isSavingDraft) return
    setIsSavingDraft(true)

    try {
      const mediaIds =
        mediaFiles.length > 0 || existingMedia.length > 0
          ? await uploadMedia()
          : undefined
      const accountIds = Array.from(selectedAccountIds)

      let scheduledAt: number | undefined
      if (isScheduled && scheduledDate) {
        const [h, m] = scheduledTime.split(":").map(Number)
        const at = new Date(scheduledDate)
        at.setHours(h, m, 0, 0)
        scheduledAt = at.getTime()
      }

      const firstAccount =
        accountIds.length > 0
          ? accounts.find((a) => a._id === accountIds[0])
          : undefined
      const draftContentType = resolveContentType(
        postType,
        firstAccount?.platform ?? "",
        (accountIds[0] as string) ?? "",
        instagramContentTypes,
        facebookContentTypes
      )

      await saveDraftMutation({
        accountIds: accountIds.length > 0 ? accountIds : [],
        contentType: draftContentType,
        textContent: caption || undefined,
        mediaIds,
        scheduledAt,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        existingDraftGroupId: editDraftGroupId,
      })

      toast.success("Draft saved")
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setIsSavingDraft(false)
    }
  }, [
    isSavingDraft,
    mediaFiles,
    existingMedia,
    selectedAccountIds,
    isScheduled,
    scheduledDate,
    scheduledTime,
    accounts,
    caption,
    postType,
    instagramContentTypes,
    facebookContentTypes,
    uploadMedia,
    saveDraftMutation,
    editDraftGroupId,
  ])

  return {
    accounts,
    selectedAccountIds,
    selectedAccounts,
    caption,
    mediaFiles,
    existingMedia,
    isScheduled,
    scheduledDate,
    scheduledTime,
    maxChars,
    isLoading: allAccounts === undefined,
    isSubmitting,
    isSavingDraft,
    hasSelectedAccounts,
    canPost,
    canSaveDraft,
    toggleAccount,
    setCaption,
    addMedia,
    removeMedia,
    setIsScheduled,
    setScheduledDate,
    setScheduledTime,
    submit,
    saveDraft,
  }
}
