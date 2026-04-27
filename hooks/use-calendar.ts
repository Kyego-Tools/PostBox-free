"use client";

import { useState, useMemo, useCallback } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export type CalendarPost = {
  _id: string;
  platform: string;
  contentType: string;
  textContent?: string;
  scheduledAt: number;
  status: string;
  mediaUrls: string[];
  account: {
    _id: string;
    platform: string;
    displayName: string;
    profileImageUrl?: string;
  } | null;
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function useCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const rawPosts = useQuery(api.posts.listAll);
  const isLoading = rawPosts === undefined;

  // Build calendar grid (6 weeks × 7 days = 42 cells)
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    // Convert Sunday=0 to Monday-based: Mon=0, Tue=1, ..., Sun=6
    const startDow = (firstDay.getDay() + 6) % 7;

    const days: { date: Date; isCurrentMonth: boolean }[] = [];

    // Previous month padding
    const prevLast = new Date(year, month, 0).getDate();
    for (let i = startDow - 1; i >= 0; i--) {
      days.push({ date: new Date(year, month - 1, prevLast - i), isCurrentMonth: false });
    }
    // Current month
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push({ date: new Date(year, month, d), isCurrentMonth: true });
    }
    // Next month padding
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
    }

    return days;
  }, [currentDate]);

  // Group posts by date string
  const postsByDate = useMemo(() => {
    if (!rawPosts) return new Map<string, CalendarPost[]>();
    const map = new Map<string, CalendarPost[]>();
    for (const post of rawPosts) {
      const key = new Date(post.scheduledAt).toDateString();
      const arr = map.get(key) || [];
      arr.push(post);
      map.set(key, arr);
    }
    return map;
  }, [rawPosts]);

  const selectedDatePosts = useMemo(() => {
    if (!selectedDate) return [];
    return postsByDate.get(selectedDate.toDateString()) || [];
  }, [selectedDate, postsByDate]);

  const monthLabel = currentDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const goToPrev = useCallback(() => {
    setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  }, []);

  const goToNext = useCallback(() => {
    setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  }, []);

  const goToToday = useCallback(() => setCurrentDate(new Date()), []);

  const openDay = useCallback((date: Date) => {
    setSelectedDate(date);
    setDialogOpen(true);
  }, []);

  const isToday = useCallback((date: Date) => {
    return date.toDateString() === new Date().toDateString();
  }, []);

  return {
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
    weekdays: WEEKDAYS,
  };
}
