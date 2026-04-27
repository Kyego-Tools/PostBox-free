"use client"

import { useState } from "react"
import {
  usePostComposer,
  type PostType,
  type DraftData,
} from "@/hooks/use-post-composer"
import AccountSelector, {
  FacebookContentType,
  type InstagramContentType,
} from "./account-selector"
import CaptionEditor from "./caption-editor"
import MediaUpload from "./media-upload"
import PostActions from "./post-actions"

const titles: Record<PostType, string> = {
  text: "Create text post",
  image: "Create image post",
  video: "Create video post",
}

interface Props {
  postType: PostType
  initialScheduleDate?: Date
  draftData?: DraftData
}

export default function PostComposer({
  postType,
  initialScheduleDate,
  draftData,
}: Props) {
  const [instagramContentTypes, setInstagramContentTypes] = useState<
    Record<string, InstagramContentType>
  >({})
  const [facebookContentTypes, setFacebookContentTypes] = useState<
    Record<string, FacebookContentType>
  >({})

  const setInstagramTypeForAccount = (
    accountId: string,
    type: InstagramContentType
  ) => setInstagramContentTypes((prev) => ({ ...prev, [accountId]: type }))

  const setFacebookTypeForAccount = (
    accountId: string,
    type: FacebookContentType
  ) => setFacebookContentTypes((prev) => ({ ...prev, [accountId]: type }))

  const c = usePostComposer(
    postType,
    initialScheduleDate,
    draftData?.draftGroupId,
    draftData,
    instagramContentTypes,
    facebookContentTypes
  )

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">
        {draftData ? "Edit draft" : titles[postType]}
      </h2>

      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="flex-1 space-y-5">
          <AccountSelector
            accounts={c.accounts}
            selectedIds={c.selectedAccountIds}
            onToggle={c.toggleAccount}
            isLoading={c.isLoading}
            postType={postType}
            instagramContentTypes={instagramContentTypes}
            onInstagramContentTypeChange={setInstagramTypeForAccount}
            facebookContentTypes={facebookContentTypes}
            onFacebookContentTypeChange={setFacebookTypeForAccount}
          />

          {postType !== "text" && (
            <MediaUpload
              postType={postType}
              files={c.mediaFiles}
              existingMedia={c.existingMedia}
              onAdd={c.addMedia}
              onRemove={c.removeMedia}
            />
          )}

          <CaptionEditor
            value={c.caption}
            onChange={c.setCaption}
            maxChars={c.maxChars}
          />
        </div>

        <div className="w-full shrink-0 lg:w-80">
          <div className="lg:sticky lg:top-6">
            <PostActions
              isScheduled={c.isScheduled}
              onScheduleToggle={c.setIsScheduled}
              scheduledDate={c.scheduledDate}
              onDateChange={c.setScheduledDate}
              scheduledTime={c.scheduledTime}
              onTimeChange={c.setScheduledTime}
              canPost={c.canPost}
              canSaveDraft={c.canSaveDraft}
              hasSelectedAccounts={c.hasSelectedAccounts}
              isSubmitting={c.isSubmitting}
              isSavingDraft={c.isSavingDraft}
              onSubmit={c.submit}
              onSaveDraft={c.saveDraft}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
