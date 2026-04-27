/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as crons from "../crons.js";
import type * as http from "../http.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_encryption from "../lib/encryption.js";
import type * as lib_oauth from "../lib/oauth.js";
import type * as lib_platforms_analytics_facebookFollowers from "../lib/platforms/analytics/facebookFollowers.js";
import type * as lib_platforms_analytics_facebookPage from "../lib/platforms/analytics/facebookPage.js";
import type * as lib_platforms_analytics_facebookPosts from "../lib/platforms/analytics/facebookPosts.js";
import type * as lib_platforms_analytics_instagramAccount from "../lib/platforms/analytics/instagramAccount.js";
import type * as lib_platforms_analytics_instagramFollowers from "../lib/platforms/analytics/instagramFollowers.js";
import type * as lib_platforms_analytics_instagramInteractions from "../lib/platforms/analytics/instagramInteractions.js";
import type * as lib_platforms_analytics_instagramPosts from "../lib/platforms/analytics/instagramPosts.js";
import type * as lib_platforms_analytics_instagramReach from "../lib/platforms/analytics/instagramReach.js";
import type * as lib_platforms_analytics_twitterPosts from "../lib/platforms/analytics/twitterPosts.js";
import type * as lib_platforms_analytics_types from "../lib/platforms/analytics/types.js";
import type * as lib_platforms_analytics_windowUtils from "../lib/platforms/analytics/windowUtils.js";
import type * as lib_platforms_facebook from "../lib/platforms/facebook.js";
import type * as lib_platforms_instagram from "../lib/platforms/instagram.js";
import type * as lib_platforms_publish_facebook from "../lib/platforms/publish/facebook.js";
import type * as lib_platforms_publish_helpers from "../lib/platforms/publish/helpers.js";
import type * as lib_platforms_publish_instagram from "../lib/platforms/publish/instagram.js";
import type * as lib_platforms_publish_tiktok from "../lib/platforms/publish/tiktok.js";
import type * as lib_platforms_publish_twitter from "../lib/platforms/publish/twitter.js";
import type * as lib_platforms_publish_types from "../lib/platforms/publish/types.js";
import type * as lib_platforms_threads from "../lib/platforms/threads.js";
import type * as lib_platforms_tiktok from "../lib/platforms/tiktok.js";
import type * as lib_platforms_twitter from "../lib/platforms/twitter.js";
import type * as lib_publishing_dispatch from "../lib/publishing/dispatch.js";
import type * as lib_publishing_media from "../lib/publishing/media.js";
import type * as media from "../media.js";
import type * as oauth from "../oauth.js";
import type * as oauthStates from "../oauthStates.js";
import type * as posts from "../posts.js";
import type * as publishing from "../publishing.js";
import type * as publishingHelpers from "../publishingHelpers.js";
import type * as scheduledPosts from "../scheduledPosts.js";
import type * as setup from "../setup.js";
import type * as socialAccounts from "../socialAccounts.js";
import type * as tokenRefresh from "../tokenRefresh.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  crons: typeof crons;
  http: typeof http;
  "lib/auth": typeof lib_auth;
  "lib/encryption": typeof lib_encryption;
  "lib/oauth": typeof lib_oauth;
  "lib/platforms/analytics/facebookFollowers": typeof lib_platforms_analytics_facebookFollowers;
  "lib/platforms/analytics/facebookPage": typeof lib_platforms_analytics_facebookPage;
  "lib/platforms/analytics/facebookPosts": typeof lib_platforms_analytics_facebookPosts;
  "lib/platforms/analytics/instagramAccount": typeof lib_platforms_analytics_instagramAccount;
  "lib/platforms/analytics/instagramFollowers": typeof lib_platforms_analytics_instagramFollowers;
  "lib/platforms/analytics/instagramInteractions": typeof lib_platforms_analytics_instagramInteractions;
  "lib/platforms/analytics/instagramPosts": typeof lib_platforms_analytics_instagramPosts;
  "lib/platforms/analytics/instagramReach": typeof lib_platforms_analytics_instagramReach;
  "lib/platforms/analytics/twitterPosts": typeof lib_platforms_analytics_twitterPosts;
  "lib/platforms/analytics/types": typeof lib_platforms_analytics_types;
  "lib/platforms/analytics/windowUtils": typeof lib_platforms_analytics_windowUtils;
  "lib/platforms/facebook": typeof lib_platforms_facebook;
  "lib/platforms/instagram": typeof lib_platforms_instagram;
  "lib/platforms/publish/facebook": typeof lib_platforms_publish_facebook;
  "lib/platforms/publish/helpers": typeof lib_platforms_publish_helpers;
  "lib/platforms/publish/instagram": typeof lib_platforms_publish_instagram;
  "lib/platforms/publish/tiktok": typeof lib_platforms_publish_tiktok;
  "lib/platforms/publish/twitter": typeof lib_platforms_publish_twitter;
  "lib/platforms/publish/types": typeof lib_platforms_publish_types;
  "lib/platforms/threads": typeof lib_platforms_threads;
  "lib/platforms/tiktok": typeof lib_platforms_tiktok;
  "lib/platforms/twitter": typeof lib_platforms_twitter;
  "lib/publishing/dispatch": typeof lib_publishing_dispatch;
  "lib/publishing/media": typeof lib_publishing_media;
  media: typeof media;
  oauth: typeof oauth;
  oauthStates: typeof oauthStates;
  posts: typeof posts;
  publishing: typeof publishing;
  publishingHelpers: typeof publishingHelpers;
  scheduledPosts: typeof scheduledPosts;
  setup: typeof setup;
  socialAccounts: typeof socialAccounts;
  tokenRefresh: typeof tokenRefresh;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
