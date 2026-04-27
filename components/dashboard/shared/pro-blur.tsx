"use client";

import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface ProBlurProps {
  children: React.ReactNode;
  /** Extra classes on the outer wrapper (e.g. flex-1, min-w-0) */
  className?: string;
}

export function ProBlur({ children, className }: ProBlurProps) {
  return (
    <div className={cn("relative", className)}>
      {/* Blurred content underneath */}
      <div className="pointer-events-none select-none blur-[2px]">
        {children}
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 flex items-center justify-center rounded-xl">
        {/* Frosted glass card */}
        <div className="mx-4 flex flex-col items-center gap-4 rounded-2xl border bg-background/80 px-8 py-8 text-center shadow-xl backdrop-blur-md">
          {/* Icon */}
          <div className="flex size-14 items-center justify-center rounded-2xl">
            <Image src="/logo.png" alt="Pro badge" width={56} height={56} />
          </div>

          {/* Labels */}
          <div className="space-y-1.5">
            <Badge className="bg-primary/10 text-primary hover:bg-primary/10">
              Pro Feature
            </Badge>
            <h3 className="text-lg font-semibold tracking-tight">
              Unlock Analytics
            </h3>
            <p className="max-w-[260px] text-sm text-muted-foreground">
              Pay once and get access forever — no monthly fees, no
              subscriptions.
            </p>
          </div>

          {/* CTA */}
          <div className="flex flex-col items-center gap-2">
            <Button size="sm" className="gap-2 px-6">
              Upgrade to Pro
            </Button>
            <p className="text-[11px] text-muted-foreground">
              One-time payment · Lifetime access
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
