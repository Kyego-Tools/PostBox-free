"use client"

import type { CalendarPost } from "@/hooks/use-calendar"
import DayCell from "./day-cell"

interface Props {
  weekdays: string[]
  calendarDays: { date: Date; isCurrentMonth: boolean }[]
  postsByDate: Map<string, CalendarPost[]>
  isToday: (date: Date) => boolean
  onDayClick: (date: Date) => void
  isLoading: boolean
}

export default function CalendarGrid({
  weekdays,
  calendarDays,
  postsByDate,
  isToday,
  onDayClick,
  isLoading,
}: Props) {
  if (isLoading) {
    return (
      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="grid grid-cols-7 border-b bg-muted/50">
          {weekdays.map((day) => (
            <div
              key={day}
              className="py-3 text-center text-xs font-semibold tracking-wider text-muted-foreground uppercase"
            >
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {Array.from({ length: 42 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse border-r border-b bg-muted/20 p-2"
              style={{ minHeight: 140 }}
            />
          ))}
        </div>
      </div>
    )
  }

  // Calculate number of rows needed
  const rows = Math.ceil(calendarDays.length / 7)

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b bg-muted/50">
        {weekdays.map((day) => (
          <div
            key={day}
            className="py-3 text-center text-xs font-semibold tracking-wider text-muted-foreground uppercase"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div
        className="grid grid-cols-7"
        style={{
          gridTemplateRows: `repeat(${rows}, minmax(140px, 1fr))`,
          minHeight: "calc(100vh - 260px)",
        }}
      >
        {calendarDays.map(({ date, isCurrentMonth }, i) => (
          <DayCell
            key={i}
            date={date}
            isCurrentMonth={isCurrentMonth}
            isToday={isToday(date)}
            posts={postsByDate.get(date.toDateString()) || []}
            onClick={() => onDayClick(date)}
          />
        ))}
      </div>
    </div>
  )
}
