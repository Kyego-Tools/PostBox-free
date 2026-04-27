"use client";

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

export default function MiniCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const calendarDots = useQuery(api.posts.getCalendarDots);

  // Build set of dates that have any posting activity
  const scheduledDates = useMemo(() => {
    const dates = new Set<string>();
    if (!calendarDots) return dates;
    for (const ts of calendarDots) {
      dates.add(new Date(ts).toDateString());
    }
    return dates;
  }, [calendarDots]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDow = firstDay.getDay();
  const today = new Date();

  // Build grid
  const days: { date: Date; isCurrentMonth: boolean }[] = [];
  const prevLast = new Date(year, month, 0).getDate();
  for (let i = startDow - 1; i >= 0; i--) {
    days.push({ date: new Date(year, month - 1, prevLast - i), isCurrentMonth: false });
  }
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push({ date: new Date(year, month, d), isCurrentMonth: true });
  }
  const remaining = 42 - days.length;
  for (let i = 1; i <= remaining; i++) {
    days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
  }

  const monthLabel = currentDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <CalendarDays className="size-4 text-primary" />
          Calendar
        </CardTitle>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-6"
            onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
          >
            <ChevronLeft className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-6"
            onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
          >
            <ChevronRight className="size-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <p className="mb-2 text-center text-xs font-semibold">{monthLabel}</p>
        <div className="grid grid-cols-7 gap-0">
          {/* Weekday headers */}
          {WEEKDAYS.map((d, i) => (
            <div
              key={`h-${i}`}
              className="flex h-7 items-center justify-center text-[10px] font-medium text-muted-foreground"
            >
              {d}
            </div>
          ))}
          {/* Day cells */}
          {days.map(({ date, isCurrentMonth }, i) => {
            const isToday = date.toDateString() === today.toDateString();
            const hasPost = scheduledDates.has(date.toDateString());

            return (
              <div
                key={i}
                className="flex flex-col items-center justify-center h-8"
              >
                <span
                  className={cn(
                    "flex size-6 items-center justify-center rounded-full text-[11px] tabular-nums",
                    !isCurrentMonth && "text-muted-foreground/40",
                    isToday && "bg-primary text-primary-foreground font-bold",
                    !isToday && isCurrentMonth && "text-foreground",
                  )}
                >
                  {date.getDate()}
                </span>
                {hasPost && (
                  <div className="mt-0.5 size-1 rounded-full bg-primary" />
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
