"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

export const BATCH_TOAST_ID = "publishing-batch";

const PLATFORM_LABEL: Record<string, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  twitter: "Twitter / X",
  threads: "Threads",
  tiktok: "TikTok",
};

export function PostingToast({ platforms }: { platforms: string[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (platforms.length <= 1) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % platforms.length), 1600);
    return () => clearInterval(id);
  }, [platforms.length]);

  const label = PLATFORM_LABEL[platforms[index]] ?? platforms[index];

  return (
    <div className="flex items-center gap-2.5">
      <Image src="/logo.png" alt="PostBox" width={24} height={24} className="rounded shrink-0" />
      <span className="text-sm flex items-center gap-1">
        <span className="text-muted-foreground">is posting on</span>
        <span className="overflow-hidden" style={{ height: "1.25rem" }}>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={label}
              initial={{ y: 14, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -14, opacity: 0 }}
              transition={{ duration: 0.22, ease: "easeInOut" }}
              className="font-semibold inline-block leading-5"
            >
              {label}
            </motion.span>
          </AnimatePresence>
        </span>
      </span>
    </div>
  );
}

export { PLATFORM_LABEL };
