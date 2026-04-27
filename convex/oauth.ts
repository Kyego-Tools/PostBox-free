import { action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { requireAuth } from "./lib/auth";
import {
  generateState,
  generateCodeVerifier,
  generateCodeChallenge,
} from "./lib/oauth";
import { getFacebookAuthUrl } from "./lib/platforms/facebook";
import { getInstagramAuthUrl } from "./lib/platforms/instagram";
import { getThreadsAuthUrl } from "./lib/platforms/threads";
import { getTikTokAuthUrl } from "./lib/platforms/tiktok";
import { getTwitterAuthUrl } from "./lib/platforms/twitter";

type Platform = "facebook" | "instagram" | "tiktok" | "twitter" | "threads";

// Env var names per platform
const PLATFORM_ENV: Record<Platform, { id: string; secret: string }> = {
  facebook: { id: "FACEBOOK_APP_ID", secret: "FACEBOOK_APP_SECRET" },
  instagram: { id: "INSTAGRAM_APP_ID", secret: "INSTAGRAM_APP_SECRET" },
  threads: { id: "THREADS_APP_ID", secret: "THREADS_APP_SECRET" },
  tiktok: { id: "TIKTOK_CLIENT_KEY", secret: "TIKTOK_CLIENT_SECRET" },
  twitter: { id: "TWITTER_CLIENT_ID", secret: "TWITTER_CLIENT_SECRET" },
};

function getCredentials(platform: Platform): {
  clientId: string;
  clientSecret: string;
} {
  const env = PLATFORM_ENV[platform];
  const clientId = process.env[env.id];
  const clientSecret = process.env[env.secret];

  if (!clientId || !clientSecret) {
    throw new Error(
      `Missing ${env.id} or ${env.secret} environment variables. ` +
        `Set them with: npx convex env set ${env.id} <value>`
    );
  }

  return { clientId, clientSecret };
}

function getCallbackUrl(platform: Platform): string {
  const siteUrl = process.env.CONVEX_SITE_URL;
  if (!siteUrl) {
    throw new Error("CONVEX_SITE_URL is not set");
  }
  return `${siteUrl}/oauth/${platform}/callback`;
}

// Platforms that use PKCE
const PKCE_PLATFORMS: Platform[] = ["tiktok", "twitter"];

export const generateOAuthLink = action({
  args: {
    platform: v.union(
      v.literal("facebook"),
      v.literal("instagram"),
      v.literal("tiktok"),
      v.literal("twitter"),
      v.literal("threads")
    ),
    redirectUrl: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<string> => {
    const userId = await requireAuth(ctx);
    const platform = args.platform;
    const { clientId } = getCredentials(platform);
    const callbackUrl = getCallbackUrl(platform);
    const redirectUrl = args.redirectUrl || "/accounts";

    // Generate CSRF state
    const state = generateState();

    // Generate PKCE if needed
    let codeVerifier: string | undefined;
    let codeChallenge: string | undefined;
    if (PKCE_PLATFORMS.includes(platform)) {
      codeVerifier = generateCodeVerifier();
      codeChallenge = await generateCodeChallenge(codeVerifier);
    }

    // Store state in DB
    await ctx.runMutation(internal.oauthStates.create, {
      userId,
      platform,
      state,
      codeVerifier,
      redirectUrl,
    });

    // Build platform-specific auth URL
    switch (platform) {
      case "facebook":
        return getFacebookAuthUrl(clientId, callbackUrl, state);
      case "instagram":
        return getInstagramAuthUrl(clientId, callbackUrl, state);
      case "threads":
        return getThreadsAuthUrl(clientId, callbackUrl, state);
      case "tiktok":
        return getTikTokAuthUrl(clientId, callbackUrl, state, codeChallenge!);
      case "twitter":
        return getTwitterAuthUrl(clientId, callbackUrl, state, codeChallenge!);
    }
  },
});
