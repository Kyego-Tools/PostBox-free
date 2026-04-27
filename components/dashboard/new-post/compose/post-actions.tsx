"use client"

import {
  Send,
  Save,
  CalendarIcon,
  Clock,
  Loader2,
  CheckCircle2,
  XCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"

interface Props {
  isScheduled: boolean
  onScheduleToggle: (v: boolean) => void
  scheduledDate: Date | undefined
  onDateChange: (d: Date | undefined) => void
  scheduledTime: string
  onTimeChange: (t: string) => void
  canPost: boolean
  canSaveDraft: boolean
  hasSelectedAccounts: boolean
  isSubmitting: boolean
  isSavingDraft?: boolean
  onSubmit: () => void
  onSaveDraft?: () => void
}

export default function PostActions({
  isScheduled,
  onScheduleToggle,
  scheduledDate,
  onDateChange,
  scheduledTime,
  onTimeChange,
  canPost,
  canSaveDraft,
  hasSelectedAccounts,
  isSubmitting,
  isSavingDraft,
  onSubmit,
  onSaveDraft,
}: Props) {
  return (
    <div className="space-y-4 rounded-xl border bg-background p-4">
      {/* Schedule toggle */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Schedule post</span>
        <Switch checked={isScheduled} onCheckedChange={onScheduleToggle} />
      </div>

      {/* Date/Time picker */}
      {isScheduled && (
        <div className="space-y-3">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !scheduledDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 size-4" />
                {scheduledDate
                  ? scheduledDate.toLocaleDateString()
                  : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={scheduledDate}
                onSelect={onDateChange}
              />
            </PopoverContent>
          </Popover>
          <div className="flex items-center gap-2">
            <Clock className="size-4 text-muted-foreground" />
            <input
              type="time"
              value={scheduledTime}
              onChange={(e) => onTimeChange(e.target.value)}
              className="flex-1 rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>
        </div>
      )}

      {/* Post / Schedule button */}
      <Button
        className="w-full"
        disabled={!canPost || isSubmitting}
        size="lg"
        onClick={onSubmit}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            Publishing...
          </>
        ) : (
          <>
            <Send className="mr-2 size-4" />
            {isScheduled ? "Schedule" : "Post now"}
          </>
        )}
      </Button>

      {!hasSelectedAccounts && (
        <p className="text-center text-xs text-muted-foreground">
          Select an account to post to
        </p>
      )}

      {/* Save draft */}
      <Button
        variant="outline"
        className="w-full"
        disabled={!canSaveDraft || isSubmitting || isSavingDraft}
        onClick={onSaveDraft}
      >
        {isSavingDraft ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Save className="mr-2 size-4" />
            Save to Drafts
          </>
        )}
      </Button>
    </div>
  )
}
