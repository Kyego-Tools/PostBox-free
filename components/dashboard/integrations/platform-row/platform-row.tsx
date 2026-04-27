import { Button } from "@/components/ui/button"
import { PLATFORM_CONFIG } from "@/lib/constants/socialPlatform"
import { SocialPlatform } from "@/lib/types/socialPlatform"
import {
  IconLoader2,
  IconCircleCheck,
  IconAlertTriangle,
  IconX,
  IconPlus,
  IconRefresh,
} from "@tabler/icons-react"
import Image from "next/image"
import React from "react"

interface ConnectedAccount {
  _id: string
  platformUsername: string
  displayName: string
  profileImageUrl?: string
  tokenHealth: "healthy" | "expiring_soon" | "expired" | "no_expiry"
  daysUntilExpiry: number | null
  status: "active" | "expired" | "revoked" | "error"
  scopes: string[]
  needsReconnect: boolean
}

interface PlatformRowProps {
  platform: SocialPlatform
  connectedAccounts: ConnectedAccount[]
  onConnect: (platform: SocialPlatform) => void
  onDisconnect: (accountId: string) => void
  isConnecting: boolean
  disconnectingId?: string | null
}

const TOKEN_HEALTH_CONFIG = {
  healthy: {
    icon: <IconCircleCheck className="size-3.5" />,
    color: "text-green-600",
    bg: "bg-green-50 border-green-200",
  },
  expiring_soon: {
    icon: <IconAlertTriangle className="size-3.5" />,
    color: "text-amber-600",
    bg: "bg-amber-50 border-amber-200",
  },
  expired: {
    icon: <IconAlertTriangle className="size-3.5" />,
    color: "text-red-600",
    bg: "bg-red-50 border-red-200",
  },
  no_expiry: {
    icon: <IconCircleCheck className="size-3.5" />,
    color: "text-green-600",
    bg: "bg-green-50 border-green-200",
  },
}

const PlatformRow = ({
  platform,
  connectedAccounts,
  onConnect,
  onDisconnect,
  isConnecting,
  disconnectingId,
}: PlatformRowProps) => {
  const config = PLATFORM_CONFIG[platform]
  const hasAccounts = connectedAccounts.length > 0

  return (
    <div className="flex items-center gap-3">
      {/* Platform icon */}
      <div
        className={`flex size-8 shrink-0 items-center justify-center ${config.color}`}
      >
        {config.icon}
      </div>

      {/* Scrollable container for button and connected accounts */}
      <div className="scrollbar-hide flex min-w-0 flex-1 items-center gap-2 overflow-x-auto">
        {/* Connect button */}
        <Button
          onClick={() => onConnect(platform)}
          size="sm"
          variant="outline"
          disabled={!config.enabled || isConnecting}
          className="w-36 shrink-0 justify-center p-4 font-semibold"
        >
          {isConnecting ? (
            <IconLoader2 className="size-4 animate-spin" />
          ) : !config.enabled ? (
            "Coming soon..."
          ) : hasAccounts ? (
            <>
              <IconPlus className="size-4" />
              Add account
            </>
          ) : (
            `Connect ${config.name}`
          )}
        </Button>

        {/* Connected account pills */}
        {connectedAccounts.map((account) => {
          const isDisconnecting = disconnectingId === account._id
          const pillBg = account.needsReconnect
            ? "bg-amber-50 border-amber-200"
            : TOKEN_HEALTH_CONFIG[account.tokenHealth].bg
          return (
            <div
              key={account._id}
              className={`flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${pillBg}`}
            >
              {/* Profile image */}
              {account.profileImageUrl ? (
                <Image
                  src={account.profileImageUrl}
                  alt={account.displayName}
                  width={20}
                  height={20}
                  className="size-5 rounded-full object-cover"
                />
              ) : (
                <div className="flex size-5 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground uppercase">
                  {account.displayName.charAt(0)}
                </div>
              )}

              {/* Username */}
              <span className="max-w-[140px] truncate font-medium text-foreground dark:text-secondary">
                {account.platformUsername}
              </span>

              {account.needsReconnect ? (
                // Reconnect required: status is expired/revoked, or scopes are
                // stale (e.g. X account connected before media.write was added).
                <button
                  onClick={() => onConnect(platform)}
                  disabled={isConnecting}
                  className="ml-0.5 flex items-center gap-1 text-xs font-medium text-amber-700 hover:text-amber-900 disabled:opacity-50"
                  title="Reconnect this account"
                >
                  <IconRefresh className="size-3.5" />
                  Reconnect
                </button>
              ) : (
                // Token health indicator
                <span
                  className={`flex items-center gap-0.5 ${TOKEN_HEALTH_CONFIG[account.tokenHealth].color}`}
                >
                  {TOKEN_HEALTH_CONFIG[account.tokenHealth].icon}
                  {account.tokenHealth === "expiring_soon" &&
                    account.daysUntilExpiry !== null && (
                      <span className="text-xs">
                        {account.daysUntilExpiry}d
                      </span>
                    )}
                </span>
              )}

              {/* Disconnect button */}
              <button
                onClick={() => onDisconnect(account._id)}
                disabled={isDisconnecting}
                className="ml-1 rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-black/10 hover:text-destructive disabled:opacity-50"
                title="Disconnect account"
              >
                {isDisconnecting ? (
                  <IconLoader2 className="size-3.5 animate-spin" />
                ) : (
                  <IconX className="size-3.5" />
                )}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default PlatformRow
