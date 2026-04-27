"use client";

import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

export default function GreetingHeader() {
  const { isAuthenticated } = useConvexAuth();
  const user = useQuery(api.users.getMe, isAuthenticated ? {} : "skip");

  const name = user?.name || user?.email?.split("@")[0] || "";

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
        {getGreeting()}
        {name ? `, ${name}` : ""}!
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Track growth and optimise your posting strategy in real time
      </p>
    </div>
  );
}
