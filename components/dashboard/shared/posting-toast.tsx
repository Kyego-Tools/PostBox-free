"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import { SmartphoneIcon } from "lucide-react"

export const BATCH_TOAST_ID = "publishing-batch"

const PLATFORM_LABEL: Record<string, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  twitter: "Twitter / X",
  threads: "Threads",
  tiktok: "TikTok",
}

export function PostingToast({ platforms }: { platforms: string[] }) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (platforms.length <= 1) return
    const id = setInterval(
      () => setIndex((i) => (i + 1) % platforms.length),
      1600
    )
    return () => clearInterval(id)
  }, [platforms.length])

  const currentPlatform = platforms[index]
  const label = PLATFORM_LABEL[currentPlatform] ?? currentPlatform
  const hasTikTok = platforms.includes("tiktok")

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2.5">
        <Image
          src="/logo.png"
          alt="PostBox"
          width={24}
          height={24}
          className="shrink-0 rounded"
        />
        <span className="flex items-center gap-1 text-sm">
          <span className="text-muted-foreground">is posting on</span>
          <span className="overflow-hidden" style={{ height: "1.25rem" }}>
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={label}
                initial={{ y: 14, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -14, opacity: 0 }}
                transition={{ duration: 0.22, ease: "easeInOut" }}
                className="inline-block leading-5 font-semibold"
              >
                {label}
              </motion.span>
            </AnimatePresence>
          </span>
        </span>
      </div>

      {hasTikTok && (
        <div className="flex items-center gap-1.5 pl-0.5 text-[11px] text-amber-600 dark:text-amber-400">
          <SmartphoneIcon className="size-3 shrink-0" />
          <span>TikTok will notify you to publish from drafts</span>
        </div>
      )}
    </div>
  )
}

export { PLATFORM_LABEL }
