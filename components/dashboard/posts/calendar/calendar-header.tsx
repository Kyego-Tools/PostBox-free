"use client";

import { Button } from "@/components/ui/button";
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  monthLabel: string;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}

export default function CalendarHeader({
  monthLabel,
  onPrev,
  onNext,
  onToday,
}: Props) {
  return (
    <div className="flex items-center justify-between">
      {/* Month & year */}
      <div className="flex items-center gap-2">
        <CalendarIcon className="size-5 text-muted-foreground" />
        <h2 className="text-lg font-semibold">{monthLabel}</h2>
      </div>

      {/* Navigation + legend */}
      <div className="flex items-center gap-4">
        {/* Legend */}
        <div className="hidden sm:flex items-center gap-3 text-xs mr-2">
          <LegendDot color="bg-emerald-500" label="Posted" />
          <LegendDot color="bg-blue-500" label="Scheduled" />
          <LegendDot color="bg-red-500" label="Failed" />
        </div>

        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs"
          onClick={onToday}
        >
          Today
        </Button>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            onClick={onPrev}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            onClick={onNext}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={`size-2 rounded-full ${color}`} />
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
}
