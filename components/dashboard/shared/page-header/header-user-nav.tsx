"use client"

import { useAuthActions } from "@convex-dev/auth/react"
import { useRouter } from "nextjs-toploader/app"
import {
  IconLogout,
  IconPlugConnected,
  IconLifebuoy,
  IconShield,
} from "@tabler/icons-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type User = {
  name?: string | null
  email?: string | null
  image?: string | null
}

function getInitials(name?: string | null, email?: string | null) {
  if (name)
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  if (email) return email.slice(0, 2).toUpperCase()
  return "?"
}

export function HeaderUserNav({ user }: { user: User }) {
  const { signOut } = useAuthActions()
  const router = useRouter()
  const initials = getInitials(user.name, user.email)

  async function handleLogout() {
    await signOut()
    router.push("/sign-in")
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Avatar className="size-7 cursor-pointer transition-opacity hover:opacity-80">
            {user.image && (
              <AvatarImage src={user.image} alt={user.name ?? ""} />
            )}
            <AvatarFallback className="bg-primary text-[10px] text-primary-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        className="min-w-56 rounded-lg"
        side="bottom"
        align="end"
        sideOffset={8}
      >
        <DropdownMenuLabel className="p-0 font-normal">
          <div className="flex items-center gap-2 px-2 py-2">
            <Avatar className="size-8 rounded-lg">
              {user.image && (
                <AvatarImage src={user.image} alt={user.name ?? ""} />
              )}
              <AvatarFallback className="rounded-lg bg-primary text-[11px] text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="grid flex-1 leading-tight">
              <span className="truncate text-sm font-medium">
                {user.name ?? user.email ?? "Account"}
              </span>
              {user.name && (
                <span className="truncate text-xs text-muted-foreground">
                  {user.email}
                </span>
              )}
            </div>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuItem
            onClick={() => router.push("/dashboard/settings/connections")}
          >
            <IconPlugConnected className="mr-2 size-4" /> Connections
          </DropdownMenuItem>
          {/* <DropdownMenuItem
            onClick={() => router.push("/dashboard/settings/support")}
          >
            <IconLifebuoy className="mr-2 size-4" /> Support
          </DropdownMenuItem> */}
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={handleLogout}
          className="text-destructive focus:text-destructive"
        >
          <IconLogout className="mr-2 size-4" /> Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
