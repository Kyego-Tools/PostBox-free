"use client"

import { PageHeader } from "@/components/dashboard/shared/page-header/page-header"
import CalendarHeader from "@/components/dashboard/posts/calendar/calendar-header"
import CalendarGrid from "@/components/dashboard/posts/calendar/calendar-grid"
import DayDetailDialog from "@/components/dashboard/posts/calendar/day-detail-dialog"
import { useCalendar } from "@/hooks/use-calendar"

export default function CalendarPage() {
  const {
    isLoading,
    calendarDays,
    postsByDate,
    monthLabel,
    goToPrev,
    goToNext,
    goToToday,
    openDay,
    isToday,
    selectedDate,
    selectedDatePosts,
    dialogOpen,
    setDialogOpen,
    weekdays,
  } = useCalendar()

  return (
    <div className="min-h-screen bg-muted/30">
      <PageHeader title="Calendar" />

      <div className="mt-13 space-y-4 p-5">
        <CalendarHeader
          monthLabel={monthLabel}
          onPrev={goToPrev}
          onNext={goToNext}
          onToday={goToToday}
        />

        <CalendarGrid
          weekdays={weekdays}
          calendarDays={calendarDays}
          postsByDate={postsByDate}
          isToday={isToday}
          onDayClick={openDay}
          isLoading={isLoading}
        />

        <DayDetailDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          date={selectedDate}
          posts={selectedDatePosts}
        />
      </div>
    </div>
  )
}
