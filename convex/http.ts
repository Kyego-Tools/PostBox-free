import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { encrypt } from "./lib/encryption";
import { auth } from "./auth";

import {
  exchangeFacebookCode,
  getFacebookPages,
  getFacebookPageById,
  debugFacebookToken,
  getInstagramAccountInfo,
} from "./lib/platforms/facebook";
import {
  exchangeInstagramCode,
  getLongLivedToken as getInstagramLongLivedToken,
  getInstagramUserInfo,
} from "./lib/platforms/instagram";
import {
  exchangeThreadsCode,
  exchangeForLongLivedToken as getThreadsLongLivedToken,
  getThreadsUserInfo,
} from "./lib/platforms/threads";
import { exchangeTikTokCode, getTikTokUserInfo } from "./lib/platforms/tiktok";
import {
  exchangeTwitterCode,
  getTwitterUserInfo,
} from "./lib/platforms/twitter";

const http = httpRouter();

// ─── Convex Auth routes (required for authentication to work) ───
auth.addHttpRoutes(http);

// ─── Helper ───

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

function redirectWithError(appUrl: string, error: string): Response {
  const url = new URL("/dashboard/settings/connections", appUrl);
  url.searchParams.set("error", error);
  return Response.redirect(url.toString(), 302);
}

function redirectWithSuccess(appUrl: string, message: string): Response {
  const url = new URL("/dashboard/settings/connections", appUrl);
  url.searchParams.set("success", message);
  return Response.redirect(url.toString(), 302);
}

function getCallbackUrl(platform: string): string {
  return `${env("CONVEX_SITE_URL")}/oauth/${platform}/callback`;
}

function getAppUrl(): string {
  return env("APP_URL");
}

// ─── Facebook Callback ───

http.route({
  path: "/oauth/facebook/callback",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const appUrl = getAppUrl();
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    if (error) {
      return redirectWithError(
        appUrl,
        url.searchParams.get("error_description") ||
          "Facebook authorization failed",
      );
    }

    if (!code || !state) {
      return redirectWithError(appUrl, "Missing authorization code");
    }

    // Validate state
    const oauthState = await ctx.runQuery(internal.oauthStates.validate, {
      state,
      platform: "facebook",
    });
    if (!oauthState) {
      return redirectWithError(appUrl, "Invalid or expired state");
    }

    await ctx.runMutation(internal.oauthStates.markUsed, {
      id: oauthState._id,
    });

    try {
      const clientId = env("FACEBOOK_APP_ID");
      const clientSecret = env("FACEBOOK_APP_SECRET");
      const redirectUri = getCallbackUrl("facebook");

      // Exchange code for token
      const tokens = await exchangeFacebookCode(
        code,
        clientId,
        clientSecret,
        redirectUri,
      );

      // Debug token to check scopes
      const tokenDebug = await debugFacebookToken(
        tokens.access_token,
        clientId,
        clientSecret,
      );

      // Get Facebook Pages
      let pages = await getFacebookPages(tokens.access_token);

      // Fallback: fetch pages from granular_scopes if /me/accounts is empty
      if (pages.length === 0 && tokenDebug.data.granular_scopes?.length) {
        const pageIds = new Set<string>();
        for (const scope of tokenDebug.data.granular_scopes) {
          if (scope.scope.startsWith("pages_") && scope.target_ids) {
            scope.target_ids.forEach((id) => pageIds.add(id));
          }
        }

        const fetched = await Promise.all(
          Array.from(pageIds).map((id) =>
            getFacebookPageById(id, tokens.access_token),
          ),
        );
        pages = fetched.filter((p): p is NonNullable<typeof p> => p !== null);
      }

      if (pages.length === 0) {
        throw new Error(
          "No Facebook Pages found. Make sure you selected at least one page during authorization.",
        );
      }

      let savedCount = 0;

      for (const page of pages) {
        const encryptedPageToken = await encrypt(page.access_token);

        // Save Facebook page
        const pageAccountId = await ctx.runMutation(
          internal.socialAccounts.upsert,
          {
            userId: oauthState.userId,
            platform: "facebook",
            platformAccountId: page.id,
            platformUsername: page.name,
            displayName: page.name,
            profileImageUrl: page.picture?.data?.url,
            accessTokenEncrypted: encryptedPageToken,
            scopes: ["pages_manage_posts", "pages_read_engagement"],
            accountType: "page",
          },
        );
        savedCount++;

        // If page has Instagram Business Account, save it too
        if (page.instagram_business_account) {
          try {
            const igInfo = await getInstagramAccountInfo(
              page.instagram_business_account.id,
              page.access_token,
            );

            await ctx.runMutation(internal.socialAccounts.upsert, {
              userId: oauthState.userId,
              platform: "instagram",
              platformAccountId: igInfo.id,
              platformUsername: igInfo.username,
              displayName: igInfo.username,
              profileImageUrl: igInfo.profile_picture_url,
              accessTokenEncrypted: encryptedPageToken, // uses page token
              scopes: [
                "instagram_content_publish",
                "instagram_manage_insights",
              ],
              accountType: igInfo.account_type,
              parentAccountId: pageAccountId,
            });
            savedCount++;
          } catch (igErr) {
            console.error(
              `Failed to fetch Instagram for page ${page.name}:`,
              igErr,
            );
          }
        }
      }

      const message =
        savedCount === 1
          ? "1 account connected"
          : `${savedCount} accounts connected`;

      return redirectWithSuccess(appUrl, message);
    } catch (err) {
      console.error("Facebook OAuth callback error:", err);
      return redirectWithError(appUrl, (err as Error).message);
    }
  }),
});

// ─── Instagram Callback (standalone) ───

http.route({
  path: "/oauth/instagram/callback",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const appUrl = getAppUrl();
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    if (error) {
      return redirectWithError(
        appUrl,
        url.searchParams.get("error_description") ||
          "Instagram authorization failed",
      );
    }

    if (!code || !state) {
      return redirectWithError(appUrl, "Missing authorization code");
    }

    const oauthState = await ctx.runQuery(internal.oauthStates.validate, {
      state,
      platform: "instagram",
    });
    if (!oauthState) {
      return redirectWithError(appUrl, "Invalid or expired state");
    }

    await ctx.runMutation(internal.oauthStates.markUsed, {
      id: oauthState._id,
    });

    try {
      const clientId = env("INSTAGRAM_APP_ID");
      const clientSecret = env("INSTAGRAM_APP_SECRET");
      const redirectUri = getCallbackUrl("instagram");

      // Exchange code for short-lived token
      const shortLived = await exchangeInstagramCode(
        code,
        clientId,
        clientSecret,
        redirectUri,
      );

      // Exchange for long-lived token (60 days)
      const longLived = await getInstagramLongLivedToken(
        shortLived.access_token,
        clientSecret,
      );

      // Get user info
      const userInfo = await getInstagramUserInfo(longLived.access_token);

      if (
        userInfo.account_type !== "BUSINESS" &&
        userInfo.account_type !== "CREATOR"
      ) {
        throw new Error(
          "Only Instagram Business or Creator accounts can be connected. Please convert your account in Instagram settings.",
        );
      }

      const tokenExpiresAt = Date.now() + longLived.expires_in * 1000;
      const encryptedToken = await encrypt(longLived.access_token);

      await ctx.runMutation(internal.socialAccounts.upsert, {
        userId: oauthState.userId,
        platform: "instagram",
        platformAccountId: userInfo.id,
        platformUsername: userInfo.username,
        displayName: userInfo.username,
        profileImageUrl: userInfo.profile_picture_url,
        accessTokenEncrypted: encryptedToken,
        tokenExpiresAt,
        scopes: [
          "instagram_basic",
          "instagram_content_publish",
          "instagram_manage_insights",
        ],
        accountType: userInfo.account_type,
      });

      return redirectWithSuccess(appUrl, "Instagram connected");
    } catch (err) {
      console.error("Instagram OAuth callback error:", err);
      return redirectWithError(appUrl, (err as Error).message);
    }
  }),
});

// ─── Threads Callback ───

http.route({
  path: "/oauth/threads/callback",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const appUrl = getAppUrl();
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    if (error) {
      return redirectWithError(
        appUrl,
        url.searchParams.get("error_description") ||
          "Threads authorization failed",
      );
    }

    if (!code || !state) {
      return redirectWithError(appUrl, "Missing authorization code");
    }

    const oauthState = await ctx.runQuery(internal.oauthStates.validate, {
      state,
      platform: "threads",
    });
    if (!oauthState) {
      return redirectWithError(appUrl, "Invalid or expired state");
    }

    await ctx.runMutation(internal.oauthStates.markUsed, {
      id: oauthState._id,
    });

    try {
      const clientId = env("THREADS_APP_ID");
      const clientSecret = env("THREADS_APP_SECRET");
      const redirectUri = getCallbackUrl("threads");

      // Exchange code for short-lived token
      const shortLived = await exchangeThreadsCode(
        code,
        clientId,
        clientSecret,
        redirectUri,
      );

      // Exchange for long-lived token (60 days)
      const longLived = await getThreadsLongLivedToken(
        shortLived.access_token,
        clientSecret,
      );

      // Get user info
      const userInfo = await getThreadsUserInfo(longLived.access_token);

      const tokenExpiresAt = Date.now() + longLived.expires_in * 1000;
      const encryptedToken = await encrypt(longLived.access_token);

      await ctx.runMutation(internal.socialAccounts.upsert, {
        userId: oauthState.userId,
        platform: "threads",
        platformAccountId: userInfo.id,
        platformUsername: userInfo.username,
        displayName: userInfo.username,
        profileImageUrl: userInfo.threads_profile_picture_url,
        accessTokenEncrypted: encryptedToken,
        tokenExpiresAt,
        scopes: [
          "threads_basic",
          "threads_content_publish",
          "threads_manage_insights",
          "threads_manage_replies",
          "threads_read_replies",
        ],
      });

      return redirectWithSuccess(appUrl, "Threads connected");
    } catch (err) {
      console.error("Threads OAuth callback error:", err);
      return redirectWithError(appUrl, (err as Error).message);
    }
  }),
});

// ─── TikTok Callback ───

http.route({
  path: "/oauth/tiktok/callback",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const appUrl = getAppUrl();
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    if (error) {
      return redirectWithError(
        appUrl,
        url.searchParams.get("error_description") ||
          "TikTok authorization failed",
      );
    }

    if (!code || !state) {
      return redirectWithError(appUrl, "Missing authorization code");
    }

    const oauthState = await ctx.runQuery(internal.oauthStates.validate, {
      state,
      platform: "tiktok",
    });
    if (!oauthState) {
      return redirectWithError(appUrl, "Invalid or expired state");
    }

    if (!oauthState.codeVerifier) {
      return redirectWithError(appUrl, "Missing PKCE code verifier");
    }

    await ctx.runMutation(internal.oauthStates.markUsed, {
      id: oauthState._id,
    });

    try {
      const clientKey = env("TIKTOK_CLIENT_KEY");
      const clientSecret = env("TIKTOK_CLIENT_SECRET");
      const redirectUri = getCallbackUrl("tiktok");

      // Exchange code for tokens (with PKCE)
      const tokens = await exchangeTikTokCode(
        code,
        clientKey,
        clientSecret,
        redirectUri,
        oauthState.codeVerifier,
      );

      // Get user info
      const userInfo = await getTikTokUserInfo(tokens.access_token);

      const tokenExpiresAt = Date.now() + tokens.expires_in * 1000;
      const encryptedAccessToken = await encrypt(tokens.access_token);
      const encryptedRefreshToken = await encrypt(tokens.refresh_token);

      await ctx.runMutation(internal.socialAccounts.upsert, {
        userId: oauthState.userId,
        platform: "tiktok",
        platformAccountId: userInfo.open_id,
        platformUsername: userInfo.display_name,
        displayName: userInfo.display_name,
        profileImageUrl: userInfo.avatar_url_100 || userInfo.avatar_url,
        accessTokenEncrypted: encryptedAccessToken,
        refreshTokenEncrypted: encryptedRefreshToken,
        tokenExpiresAt,
        scopes: tokens.scope.split(","),
      });

      return redirectWithSuccess(appUrl, "TikTok connected");
    } catch (err) {
      console.error("TikTok OAuth callback error:", err);
      return redirectWithError(appUrl, (err as Error).message);
    }
  }),
});

// ─── Twitter Callback ───

http.route({
  path: "/oauth/twitter/callback",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const appUrl = getAppUrl();
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    if (error) {
      return redirectWithError(
        appUrl,
        url.searchParams.get("error_description") ||
          "Twitter authorization failed",
      );
    }

    if (!code || !state) {
      return redirectWithError(appUrl, "Missing authorization code");
    }

    const oauthState = await ctx.runQuery(internal.oauthStates.validate, {
      state,
      platform: "twitter",
    });
    if (!oauthState) {
      return redirectWithError(appUrl, "Invalid or expired state");
    }

    if (!oauthState.codeVerifier) {
      return redirectWithError(appUrl, "Missing PKCE code verifier");
    }

    await ctx.runMutation(internal.oauthStates.markUsed, {
      id: oauthState._id,
    });

    try {
      const clientId = env("TWITTER_CLIENT_ID");
      const clientSecret = env("TWITTER_CLIENT_SECRET");
      const redirectUri = getCallbackUrl("twitter");

      // Exchange code for tokens (with PKCE)
      const tokens = await exchangeTwitterCode(
        code,
        clientId,
        clientSecret,
        redirectUri,
        oauthState.codeVerifier,
      );

      // Get user info
      const userInfo = await getTwitterUserInfo(tokens.access_token);

      const tokenExpiresAt = Date.now() + tokens.expires_in * 1000;
      const encryptedAccessToken = await encrypt(tokens.access_token);
      const encryptedRefreshToken = await encrypt(tokens.refresh_token);

      await ctx.runMutation(internal.socialAccounts.upsert, {
        userId: oauthState.userId,
        platform: "twitter",
        platformAccountId: userInfo.id,
        platformUsername: userInfo.username,
        displayName: userInfo.name,
        profileImageUrl: userInfo.profile_image_url,
        accessTokenEncrypted: encryptedAccessToken,
        refreshTokenEncrypted: encryptedRefreshToken,
        tokenExpiresAt,
        scopes: tokens.scope.split(" "),
      });

      return redirectWithSuccess(appUrl, "Twitter connected");
    } catch (err) {
      console.error("Twitter OAuth callback error:", err);
      return redirectWithError(appUrl, (err as Error).message);
    }
  }),
});

export default http;
