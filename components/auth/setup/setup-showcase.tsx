"use client"

import { motion } from "framer-motion"
import {
  TrendingUp,
  Users,
  Eye,
  CalendarCheck,
  BarChart3,
  Zap,
} from "lucide-react"
import {
  FaFacebookF,
  FaInstagram,
  FaTiktok,
  FaXTwitter,
  FaThreads,
} from "react-icons/fa6"

const floatingCards = [
  {
    icon: <Users className="size-4" />,
    label: "Followers",
    value: "12,847",
    change: "+12.5%",
    positive: true,
    className: "top-[12%] left-[8%]",
    delay: 0,
  },
  {
    icon: <Eye className="size-4" />,
    label: "Views",
    value: "48.2K",
    change: "+23.1%",
    positive: true,
    className: "top-[8%] right-[10%]",
    delay: 0.15,
  },
  {
    icon: <TrendingUp className="size-4" />,
    label: "Engagement",
    value: "5.4%",
    change: "+1.2%",
    positive: true,
    className: "bottom-[30%] left-[5%]",
    delay: 0.3,
  },
  {
    icon: <CalendarCheck className="size-4" />,
    label: "Scheduled",
    value: "24",
    change: "this week",
    positive: true,
    className: "bottom-[18%] right-[8%]",
    delay: 0.45,
  },
]

const platforms = [
  { icon: <FaFacebookF />, bg: "bg-[#1877F2]" },
  {
    icon: <FaInstagram />,
    bg: "bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF]",
  },
  { icon: <FaTiktok />, bg: "bg-black" },
  { icon: <FaXTwitter />, bg: "bg-black" },
  { icon: <FaThreads />, bg: "bg-neutral-800" },
]

export default function SetupShowcase() {
  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-3xl bg-gradient-to-br from-primary/90 via-primary to-primary/80 p-8">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "32px 32px",
          }}
        />
      </div>

      {/* Center content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="relative z-10 text-center"
      >
        <h2 className="text-3xl leading-tight font-bold text-white">
          Manage all your
          <br />
          social media.
        </h2>
        <p className="mx-auto mt-3 max-w-[280px] text-sm text-white/70">
          Schedule posts, track analytics, and grow your audience across 5
          platforms.
        </p>

        {/* Platform icons */}
        <div className="mt-6 flex items-center justify-center gap-2">
          {platforms.map((p, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                delay: 0.5 + i * 0.08,
                type: "spring",
                stiffness: 200,
              }}
              className={`flex size-9 items-center justify-center rounded-full text-sm text-white ${p.bg} ring-2 ring-white/20`}
            >
              {p.icon}
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Floating analytics cards */}
      {floatingCards.map((card, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 30, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{
            delay: 0.6 + card.delay,
            duration: 0.5,
            type: "spring",
            stiffness: 120,
          }}
          className={`absolute ${card.className} z-20`}
        >
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{
              duration: 3 + i * 0.5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.3,
            }}
            className="min-w-[130px] rounded-xl bg-white/95 px-4 py-3 shadow-xl backdrop-blur-sm"
          >
            <div className="mb-1 flex items-center gap-2">
              <span className="text-primary">{card.icon}</span>
              <span className="text-[11px] font-medium text-muted-foreground">
                {card.label}
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold text-foreground">
                {card.value}
              </span>
              <span className="text-[10px] font-medium text-emerald-600">
                {card.change}
              </span>
            </div>
          </motion.div>
        </motion.div>
      ))}

      {/* Mini chart card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1.2, duration: 0.5 }}
        className="absolute bottom-[6%] left-1/2 z-20 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="flex items-center gap-4 rounded-xl bg-white/95 px-5 py-3 shadow-xl backdrop-blur-sm"
        >
          <div className="flex items-center gap-2">
            <BarChart3 className="size-4 text-primary" />
            <span className="text-xs font-medium text-muted-foreground">
              Growth
            </span>
          </div>
          {/* Mini bar chart */}
          <div className="flex h-6 items-end gap-[3px]">
            {[40, 65, 45, 80, 60, 90, 75].map((h, i) => (
              <motion.div
                key={i}
                initial={{ height: 0 }}
                animate={{ height: `${h}%` }}
                transition={{ delay: 1.4 + i * 0.08, duration: 0.4 }}
                className="w-[6px] rounded-sm bg-primary/70"
              />
            ))}
          </div>
          <div className="flex items-center gap-1">
            <Zap className="size-3 text-amber-500" />
            <span className="text-xs font-bold text-foreground">+34%</span>
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}
