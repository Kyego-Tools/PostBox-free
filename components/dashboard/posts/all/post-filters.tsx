"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type {
  SortOrder,
  PlatformFilter,
  TimeFilter,
} from "@/hooks/use-all-posts"

interface Props {
  sort: SortOrder
  onSortChange: (v: SortOrder) => void
  platform: PlatformFilter
  onPlatformChange: (v: PlatformFilter) => void
  timeRange: TimeFilter
  onTimeRangeChange: (v: TimeFilter) => void
}

const SORT_OPTIONS: { value: SortOrder; label: string }[] = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
]

const PLATFORM_OPTIONS: { value: PlatformFilter; label: string }[] = [
  { value: "all", label: "All Platforms" },
  { value: "facebook", label: "Facebook" },
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "twitter", label: "Twitter" },
  { value: "threads", label: "Threads" },
]

const TIME_OPTIONS: { value: TimeFilter; label: string }[] = [
  { value: "all", label: "All Time" },
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
]

export default function PostFilters({
  sort,
  onSortChange,
  platform,
  onPlatformChange,
  timeRange,
  onTimeRangeChange,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <FilterSelect
        options={SORT_OPTIONS}
        value={sort}
        onChange={onSortChange as (v: string) => void}
      />
      <FilterSelect
        options={PLATFORM_OPTIONS}
        value={platform}
        onChange={onPlatformChange as (v: string) => void}
      />
      <FilterSelect
        options={TIME_OPTIONS}
        value={timeRange}
        onChange={onTimeRangeChange as (v: string) => void}
      />
    </div>
  )
}

function FilterSelect({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9 w-[150px] text-sm">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
