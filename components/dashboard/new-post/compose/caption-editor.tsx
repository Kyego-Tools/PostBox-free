"use client";

import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface Props {
  value: string;
  onChange: (value: string) => void;
  maxChars: number;
}

export default function CaptionEditor({ value, onChange, maxChars }: Props) {
  const charCount = value.length;
  const isOver = charCount > maxChars;
  const isNear = charCount > maxChars * 0.9;

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium flex items-center gap-1.5">
        Main Caption
      </label>
      <div className="relative">
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Start writing your post here..."
          className="min-h-[140px] resize-y pr-4 pb-8 text-sm"
        />
        <span
          className={cn(
            "absolute bottom-2 right-3 text-xs tabular-nums",
            isOver
              ? "text-destructive font-medium"
              : isNear
                ? "text-amber-500"
                : "text-muted-foreground"
          )}
        >
          {charCount}/{maxChars}
        </span>
      </div>
    </div>
  );
}
