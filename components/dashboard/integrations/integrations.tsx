"use client";

import { SocialPlatform } from "@/lib/types/socialPlatform";
import React, { useState } from "react";
import { useQuery, useAction, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import PlatformRow from "./platform-row/platform-row";

// Display order for platforms
const platformOrder: SocialPlatform[] = [
  "facebook",
  "instagram",
  "twitter",
  "tiktok",
  "threads",
];

// Platforms that have OAuth implemented
const OAUTH_PLATFORMS = [
  "facebook",
  "instagram",
  "twitter",
  "tiktok",
  "threads",
] as const;

type OAuthPlatform = (typeof OAUTH_PLATFORMS)[number];

function isOAuthPlatform(platform: SocialPlatform): platform is OAuthPlatform {
  return (OAUTH_PLATFORMS as readonly string[]).includes(platform);
}

const Integrations = () => {
  const accounts = useQuery(api.socialAccounts.listWithHealth);
  const generateOAuthLink = useAction(api.oauth.generateOAuthLink);
  const disconnectAccount = useMutation(api.socialAccounts.disconnect);

  const [connectingPlatform, setConnectingPlatform] =
    useState<SocialPlatform | null>(null);
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);

  const handleConnect = async (platform: SocialPlatform) => {
    if (!isOAuthPlatform(platform)) {
      toast.info(`${platform} is not yet supported.`);
      return;
    }

    setConnectingPlatform(platform);

    try {
      const authUrl = await generateOAuthLink({
        platform,
        redirectUrl: "/dashboard/integrations",
      });

      // Navigate to the OAuth provider
      window.location.href = authUrl;
    } catch (err) {
      console.error("Failed to generate OAuth link:", err);
      toast.error(
        (err as Error).message || `Failed to connect ${platform}. Check your API credentials.`
      );
      setConnectingPlatform(null);
    }
  };

  const handleDisconnect = async (accountId: string) => {
    setDisconnectingId(accountId);

    try {
      await disconnectAccount({
        id: accountId as Id<"socialAccounts">,
      });
      toast.success("Account disconnected.");
    } catch (err) {
      console.error("Failed to disconnect:", err);
      toast.error("Failed to disconnect account.");
    } finally {
      setDisconnectingId(null);
    }
  };

  return (
    <div className="flex-1">
      {/* Info banner */}
      <div className="mb-6 p-4 bg-muted/50 rounded-lg border">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">
            Unlimited accounts per platform.
          </span>{" "}
          Connect as many accounts as you need for each social media platform.
          Click the connect button again to add another account.
        </p>
      </div>
      <div className="space-y-5">
        {platformOrder.map((platform) => {
          // Find all connected accounts for this platform
          const connectedAccounts =
            accounts?.filter((acc) => acc.platform === platform) ?? [];

          return (
            <PlatformRow
              key={platform}
              platform={platform}
              connectedAccounts={connectedAccounts.map((acc) => ({
                _id: acc._id,
                platformUsername: acc.platformUsername,
                displayName: acc.displayName,
                profileImageUrl: acc.profileImageUrl,
                tokenHealth: acc.tokenHealth,
                daysUntilExpiry: acc.daysUntilExpiry,
                status: acc.status,
                scopes: acc.scopes,
                needsReconnect:
                  acc.status === "expired" ||
                  acc.status === "revoked" ||
                  (acc.platform === "twitter" &&
                    !acc.scopes.includes("media.write")),
              }))}
              onConnect={handleConnect}
              onDisconnect={handleDisconnect}
              isConnecting={connectingPlatform === platform}
              disconnectingId={disconnectingId}
            />
          );
        })}
      </div>
    </div>
  );
};

export default Integrations;
